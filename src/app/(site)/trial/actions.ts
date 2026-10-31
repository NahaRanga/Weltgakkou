"use server";

import { z } from "zod";
import { findOrCreateProfile } from "@/lib/accounts";
import { seatsTaken } from "@/lib/billing";
import { registrationDeadline } from "@/lib/batches";
import { notifyAdmin, sendEmail } from "@/lib/email";
import { sendPasswordEmail, verificationEnabled, verifiedUserId } from "@/lib/email-verification";
import { formatDateTime, siteUrl } from "@/lib/format";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export type TrialState = {
  ok?: string;
  error?: string;
  fieldErrors?: Partial<Record<"full_name" | "email" | "whatsapp" | "batch_id", string>>;
  values?: Record<string, string>;
};

const schema = z.object({
  batch_id: z.uuid("Pilih jadwal kelas trial"),
  full_name: z.string().trim().min(2, "Nama minimal 2 huruf").max(100),
  whatsapp: z
    .string()
    .trim()
    .transform((v) => v.replace(/[\s-]/g, ""))
    .pipe(z.string().regex(/^(\+62|62|0)8\d{7,12}$/, "Nomor WhatsApp tidak valid, contoh 081234567890"))
    .transform((v) => (v.startsWith("+62") ? "62" + v.slice(3) : v.startsWith("0") ? "62" + v.slice(1) : v)),
  email: z.email("Email wajib diisi, dipakai untuk login").transform((v) => v.trim().toLowerCase()),
});

// Daftar kelas trial gratis: akun dibuat (atau dipakai yang lama), langsung aktif tanpa tagihan.
// Satu akun hanya boleh ikut satu kelas trial.
export async function registerTrial(_prev: TrialState, formData: FormData): Promise<TrialState> {
  const values = Object.fromEntries(["batch_id", "full_name", "email", "whatsapp"].map((k) => [k, String(formData.get(k) ?? "")]));
  const parsed = schema.safeParse(values);
  if (!parsed.success) {
    const fieldErrors: TrialState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof NonNullable<TrialState["fieldErrors"]>;
      fieldErrors[key] ??= issue.message;
    }
    return { error: "Periksa lagi isian yang ditandai.", fieldErrors, values };
  }
  const input = parsed.data;

  const db = getSupabaseAdmin();
  if (!db) return { error: "Pendaftaran sedang gangguan. Silakan hubungi kami lewat WhatsApp.", values };

  const { data: batch } = await db
    .from("batches")
    .select("*, programs(name), sessions(starts_at)")
    .eq("id", input.batch_id)
    .maybeSingle();
  if (!batch?.is_trial || batch.status !== "buka") return { error: "Jadwal kelas trial ini sudah tidak menerima pendaftaran.", values };
  const sessionTimes = ((batch.sessions ?? []) as { starts_at: string }[]).map((s) => s.starts_at).sort();
  const firstSession = sessionTimes[0] ?? null;
  if (registrationDeadline({ ...batch, firstSession }).getTime() < Date.now())
    return { error: "Pendaftaran kelas trial ini sudah ditutup. Pilih jadwal lain atau masuk waiting list.", values };

  const verifiedId = verificationEnabled() ? await verifiedUserId(input.email) : null;
  if (verificationEnabled() && !verifiedId)
    return { error: "Verifikasi email dulu: klik Kirim kode, lalu masukkan kode dari email.", fieldErrors: { email: "Email belum diverifikasi" }, values };

  const account = await findOrCreateProfile(db, input, verifiedId);
  if ("error" in account) return { error: account.error, values };
  const { profileId } = account;

  const { data: priorTrials } = await db
    .from("enrollments")
    .select("id, batch_id, batches!inner(is_trial)")
    .eq("profile_id", profileId)
    .eq("batches.is_trial", true)
    .neq("status", "keluar");
  if (priorTrials?.some((e) => e.batch_id === input.batch_id))
    return { ok: "Kamu sudah terdaftar di kelas trial ini. Link Zoom ada di area belajar setelah login." };
  if (priorTrials?.length) return { error: "Email ini sudah pernah ikut kelas trial. Satu akun hanya bisa ikut satu kali, ya.", values };

  if ((await seatsTaken(db, input.batch_id)) >= batch.quota) return { error: "Maaf, kuota kelas trial ini sudah penuh. Pilih jadwal lain.", values };

  const { error } = await db
    .from("enrollments")
    .upsert(
      { profile_id: profileId, batch_id: input.batch_id, status: "aktif", agreed_at: new Date().toISOString() },
      { onConflict: "profile_id,batch_id" },
    );
  if (error) throw error;
  await db.from("leads").update({ status: "daftar" }).eq("whatsapp", input.whatsapp).in("status", ["baru", "dihubungi"]);

  // Login cukup pakai kode email; link atur password tetap dikirim untuk yang ingin pakai password.
  if (account.created) await sendPasswordEmail(input.email);
  // Rangkaian trial bisa 2 sesi (Sabtu + Minggu): sebut semuanya.
  const when = sessionTimes.length ? sessionTimes.map((t) => `${formatDateTime(t)} WIB`).join(" dan ") : batch.start_date;

  await notifyAdmin(
    `Pendaftar kelas trial: ${input.full_name}`,
    `${input.full_name} daftar ${batch.name} (${when}).\nWhatsApp: https://wa.me/${input.whatsapp}\nEmail: ${input.email}`,
  ).catch(() => {});

  // Konfirmasi ke pendaftar, sekaligus pengingat jadwal (semua sesi rangkaian).
  await sendEmail(
    input.email,
    `Kamu terdaftar kelas trial gratis Weltgakko`,
    [
      `Halo ${input.full_name},`,
      "",
      `Kamu sudah terdaftar di ${batch.name}. Sekali daftar berlaku untuk semua sesinya:`,
      ...sessionTimes.map((t, i) => `${i + 1}. ${formatDateTime(t)} WIB`),
      "",
      `Link Zoom ada di area belajar: ${siteUrl()}/masuk (pakai email ini, pilih "Kode dari email"). Tombol Masuk kelas muncul 15 menit sebelum kelas.`,
      "",
      "Sampai ketemu di kelas!",
      "Weltgakko",
    ].join("\n"),
  ).catch(() => {});

  return {
    ok: `Kursi kamu sudah aman untuk ${sessionTimes.length > 1 ? `${sessionTimes.length} sesi: ` : ""}${when}. Sekali daftar berlaku untuk semua sesinya. Masuk ke area belajar di halaman Masuk dengan email ${input.email}, pilih "Kode dari email" (tanpa password). Tombol Masuk kelas (Zoom) muncul di sana 15 menit sebelum kelas.`,
  };
}
