import "server-only";
import type { CertificateData } from "@/lib/certificate-pdf";
import { formatDate, siteUrl } from "@/lib/format";
import type { getSupabaseAdmin } from "@/lib/supabase-admin";

type Db = NonNullable<ReturnType<typeof getSupabaseAdmin>>;

// Huruf/angka yang tidak mirip satu sama lain (tanpa 0/O, 1/I/L).
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

// Nomor acak (bukan urut) supaya nama siswa tidak bisa ditebak lewat halaman cek keaslian.
export function newCertificateNo(now = new Date()) {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  const code = [...bytes].map((b) => ALPHABET[b % ALPHABET.length]).join("");
  return `WG-${String(now.getUTCFullYear()).slice(2)}-${code}`;
}

export const isCertificateNo = (s: string) => /^WG-\d{2}-[2-9A-HJKMNP-Z]{6}$/.test(s);

// Memberi nomor sertifikat ke enrollment yang belum punya. Batch trial tidak dapat sertifikat.
// Sebelum migrasi 0007 dijalankan kolomnya belum ada: fungsi ini diam saja dan mengembalikan 0.
export async function issueCertificates(db: Db, enrollmentIds: string[]) {
  if (enrollmentIds.length === 0) return 0;
  const { data, error } = await db.from("enrollments").select("*, batches(*)").in("id", enrollmentIds);
  if (error || !data) return 0;
  const rows = data as unknown as { id: string; certificate_no?: string | null; batches: { is_trial?: boolean } }[];
  if (rows.length && !("certificate_no" in rows[0])) return 0;

  let issued = 0;
  const now = new Date().toISOString();
  for (const row of rows.filter((r) => !r.certificate_no && !r.batches.is_trial)) {
    // Ulangi sekali bila nomor kebetulan bentrok (unique).
    for (let attempt = 0; attempt < 2; attempt++) {
      const { error: updateError } = await db
        .from("enrollments")
        .update({ certificate_no: newCertificateNo(), certificate_issued_at: now })
        .eq("id", row.id)
        .is("certificate_no", null);
      if (!updateError) {
        issued++;
        break;
      }
    }
  }
  return issued;
}

export type CertificateRecord = CertificateData & {
  enrollmentId: string;
  profileId: string;
  teacherId: string | null;
};

type Row = {
  id: string;
  profile_id: string;
  certificate_no: string | null;
  certificate_issued_at: string | null;
  profiles: { full_name: string };
  batches: {
    name: string;
    mode: string;
    start_date: string;
    teacher_id: string | null;
    programs: { name: string };
    sessions: { starts_at: string; kind: string }[];
  };
};

// Data sertifikat berdasarkan id enrollment atau nomor sertifikat; null bila belum diterbitkan.
export async function loadCertificate(db: Db, by: { enrollmentId: string } | { number: string }): Promise<CertificateRecord | null> {
  const query = db
    .from("enrollments")
    .select("*, profiles(full_name), batches(name, mode, start_date, teacher_id, programs(name), sessions(starts_at, kind))");
  const { data, error } = await ("number" in by ? query.eq("certificate_no", by.number) : query.eq("id", by.enrollmentId)).maybeSingle();
  if (error || !data) return null;
  const row = data as unknown as Row;
  if (!row.certificate_no || !row.certificate_issued_at) return null;

  const batch = row.batches;
  const sessions = [...(batch.sessions ?? [])].sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const classes = sessions.filter((s) => s.kind === "kelas").length;
  const last = sessions.at(-1)?.starts_at;
  const host = siteUrl().replace(/^https?:\/\//, "");

  return {
    enrollmentId: row.id,
    profileId: row.profile_id,
    teacherId: batch.teacher_id,
    number: row.certificate_no,
    name: row.profiles.full_name,
    programName: batch.programs.name,
    batchName: batch.name,
    period: last ? `${formatDate(batch.start_date)} s.d. ${formatDate(last)}` : `Mulai ${formatDate(batch.start_date)}`,
    detail: batch.mode === "rekaman" ? "Paket video rekaman" : `${classes} pertemuan kelas online`,
    issuedOn: formatDate(row.certificate_issued_at),
    verifyUrl: `${host}/sertifikat/${row.certificate_no}`,
  };
}
