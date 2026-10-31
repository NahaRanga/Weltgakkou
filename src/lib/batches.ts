import "server-only";
import { cache } from "react";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export type OpenBatch = {
  id: string;
  name: string;
  start_date: string;
  schedule_label: string;
  quota: number;
  seatsLeft: number;
  programSlug: string;
  programName: string;
  isTrial: boolean;
  // Waktu kelas pertama (ISO), dipakai untuk jam kelas trial.
  firstSession: string | null;
  // Waktu sesi-sesi awal (ISO, maks 3); trial bisa satu rangkaian 2 sesi (mis. Sabtu + Minggu).
  sessionTimes: string[];
  // Batas akhir pendaftaran (ISO), dari kolom registration_deadline atau default.
  deadline: string;
};

type BatchRow = {
  id: string;
  name: string;
  start_date: string;
  schedule_label: string;
  quota: number;
  // Dua kolom ini dari migrasi 0005; sebelum migrasi dijalankan nilainya undefined.
  is_trial?: boolean;
  registration_deadline?: string | null;
  programs: { slug: string; name: string } | null;
  enrollments: { status: string }[];
  sessions: { starts_at: string }[];
};

// Tenggat default: batch berbayar H-1 jam 23.59 WIB (keputusan winata, 2026-10-18);
// kelas trial sampai kelas dimulai.
export function registrationDeadline(b: {
  start_date: string;
  is_trial?: boolean;
  registration_deadline?: string | null;
  firstSession?: string | null;
}): Date {
  if (b.registration_deadline) return new Date(b.registration_deadline);
  if (b.is_trial && b.firstSession) return new Date(b.firstSession);
  return new Date(new Date(`${b.start_date}T00:00:00+07:00`).getTime() - 60_000);
}

// Semua batch live berstatus buka yang tenggatnya belum lewat, urut tanggal mulai.
// Pakai select("*") supaya tetap jalan walau migrasi 0005 belum dijalankan.
const listOpen = cache(async (): Promise<OpenBatch[]> => {
  const db = getSupabaseAdmin();
  if (!db) return [];
  const { data, error } = await db
    .from("batches")
    .select("*, programs(slug, name), enrollments(status), sessions(starts_at)")
    .eq("mode", "live")
    .eq("status", "buka")
    .order("start_date")
    .order("starts_at", { referencedTable: "sessions" })
    .limit(3, { referencedTable: "sessions" });
  if (error) console.error("Gagal membaca batch buka", error.message);
  const now = Date.now();

  return ((data ?? []) as unknown as BatchRow[]).flatMap((b) => {
    const firstSession = b.sessions[0]?.starts_at ?? null;
    const deadline = registrationDeadline({ ...b, firstSession });
    if (deadline.getTime() < now || !b.programs) return [];
    const taken = b.enrollments.filter((e) => e.status === "menunggu_bayar" || e.status === "aktif").length;
    return [
      {
        id: b.id,
        name: b.name,
        start_date: b.start_date,
        schedule_label: b.schedule_label,
        quota: b.quota,
        seatsLeft: Math.max(0, b.quota - taken),
        programSlug: b.programs.slug,
        programName: b.programs.name,
        isTrial: b.is_trial === true,
        firstSession,
        sessionTimes: b.sessions.map((x) => x.starts_at),
        deadline: deadline.toISOString(),
      },
    ];
  });
});

// Batch berbayar yang sedang membuka pendaftaran untuk satu program (kuota penuh tetap tampil).
export async function getOpenBatches(programSlug: string): Promise<OpenBatch[]> {
  return (await listOpen()).filter((b) => !b.isTrial && b.programSlug === programSlug);
}

// Batch berbayar yang masih bisa didaftar (untuk banner "Batch dibuka").
export async function openBatches(): Promise<OpenBatch[]> {
  return (await listOpen()).filter((b) => !b.isTrial && b.seatsLeft > 0);
}

// Kelas trial gratis mendatang, urut jadwal (kuota penuh tetap tampil).
export async function upcomingTrials(): Promise<OpenBatch[]> {
  return (await listOpen())
    .filter((b) => b.isTrial)
    .sort((a, b) => (a.firstSession ?? a.start_date).localeCompare(b.firstSession ?? b.start_date));
}

export type RecordingPackage = { batchId: string; price: number; months: number; videos: number };

// Paket rekaman video yang sedang dijual untuk satu program, bila ada.
export async function getRecordingPackage(programSlug: string): Promise<RecordingPackage | null> {
  const db = getSupabaseAdmin();
  if (!db) return null;
  const { data: program } = await db
    .from("programs")
    .select("id, recording_price, recording_months")
    .eq("slug", programSlug)
    .maybeSingle();
  if (!program?.recording_price) return null;
  const [{ data: batch }, { count }] = await Promise.all([
    db.from("batches").select("id").eq("program_id", program.id).eq("mode", "rekaman").eq("status", "buka").maybeSingle(),
    db.from("recordings").select("id", { count: "exact", head: true }).eq("program_id", program.id),
  ]);
  if (!batch) return null;
  return { batchId: batch.id, price: program.recording_price, months: program.recording_months, videos: count ?? 0 };
}
