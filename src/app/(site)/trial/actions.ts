"use server";

import { z } from "zod";
import { findOrCreateProfile } from "@/lib/accounts";
import { seatsTaken } from "@/lib/billing";
import { registrationDeadline } from "@/lib/batches";
import { notifyAdmin, sendEmail } from "@/lib/email";
import { sendPasswordEmail } from "@/lib/email-verification";
import { formatDateTime, siteUrl } from "@/lib/format";
import { HEARD_FROM, heardFromLabel, normalizeHandle } from "@/lib/social-handle";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export type TrialState = {
  ok?: string;
  error?: string;
  fieldErrors?: Partial<Record<"full_name" | "email" | "whatsapp" | "batch_id" | "instagram" | "tiktok" | "heard_from", string>>;
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
  // Opsional: "@nama", "nama", atau link profil; disimpan sebagai username tanpa @.
  instagram: handle("instagram"),
  tiktok: handle("tiktok"),
  heard_from: z
    .string()
    .transform((v) => v || null)
    .pipe(z.enum(HEARD_FROM.map((o) => o.value) as [string, ...string[]], "Pilih salah satu").nullable()),
});

function handle(platform: "instagram" | "tiktok") {
  return z.string().transform((v, ctx) => {
    const r = normalizeHandle(platform, v);
    if ("error" in r) {
      ctx.addIssue({ code: "custom", message: r.error });
      return z.NEVER;
    }
    return r.value;
  });
}

// Kolom kode PostgREST/Postgres saat kolom belum ada (migrasi 0014 belum dijalankan).
const isMissingColumn = (e: { code?: string } | null) => e?.code === "PGRST204" || e?.code === "42703";

// Anti-spam ringan tanpa langkah tambahan: kolom jebakan tersembunyi (diisi bot) dan
// waktu isi minimal (bot mengirim form dalam hitungan milidetik).
const MIN_FILL_MS = 3000;
function looksLikeBot(formData: FormData) {
  if (String(formData.get("website") ?? "").trim()) return true;
  const startedAt = Number(formData.get("started_at"));
  return Number.isFinite(startedAt) && startedAt > 0 && Date.now() - startedAt < MIN_FILL_MS;
}

// Daftar kelas trial gratis TANPA verifikasi email/login (winata 2026-11-09: kode OTP bikin ribet).
// Akun dibuat (atau dipakai yang lama), langsung aktif tanpa tagihan. Satu akun hanya boleh ikut satu kelas trial.
export async function registerTrial(_prev: TrialState, formData: FormData): Promise<TrialState> {
  const values = Object.fromEntries(["batch_id", "full_name", "email", "whatsapp", "instagram", "tiktok", "heard_from"].map((k) => [k, String(formData.get(k) ?? "")]));
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
  // Bot: pura-pura berhasil supaya tidak mencoba lagi, tapi tidak disimpan.
  if (looksLikeBot(formData)) {
    console.warn("Pendaftaran trial ditolak sebagai spam", input.email);
    return { ok: "Pendaftaran kamu sudah kami terima. Admin akan menghubungi lewat WhatsApp." };
  }

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

  // Email tidak diverifikasi: profil lama dengan email ini tidak diubah (WA-nya tetap).
  const account = await findOrCreateProfile(db, input, null, false);
  if ("error" in account) return { error: account.error, values };
  const { profileId } = account;

  const { data: priorTrials } = await db
    .from("enrollments")
    .select("id, batch_id, batches!inner(is_trial)")
    .eq("profile_id", profileId)
    .eq("batches.is_trial", true)
    .neq("status", "keluar");
  if (priorTrials?.some((e) => e.batch_id === input.batch_id))
    return { ok: "Kamu sudah terdaftar di kelas trial ini. Link Zoom dikirim lewat email/WhatsApp sebelum kelas." };
  if (priorTrials?.length) return { error: "Email ini sudah pernah ikut kelas trial. Satu akun hanya bisa ikut satu kali, ya.", values };

  if ((await seatsTaken(db, input.batch_id)) >= batch.quota) return { error: "Maaf, kuota kelas trial ini sudah penuh. Pilih jadwal lain.", values };

  const base = { profile_id: profileId, batch_id: input.batch_id, status: "aktif", agreed_at: new Date().toISOString() };
  const extra = { instagram: input.instagram, tiktok: input.tiktok, heard_from: input.heard_from };
  let { error } = await db.from("enrollments").upsert({ ...base, ...extra }, { onConflict: "profile_id,batch_id" });
  // Sebelum migrasi 0014 jalan: tetap daftarkan, isian sosmed/sumber hanya ikut di email admin.
  if (isMissingColumn(error)) {
    console.warn("Kolom sosmed trial belum ada, jalankan 0014_trial_sosmed.sql");
    ({ error } = await db.from("enrollments").upsert(base, { onConflict: "profile_id,batch_id" }));
  }
  if (error) throw error;
  await db.from("leads").update({ status: "daftar" }).eq("whatsapp", input.whatsapp).in("status", ["baru", "dihubungi"]);

  // Login cukup pakai kode email; link atur password tetap dikirim untuk yang ingin pakai password.
  if (account.created) await sendPasswordEmail(input.email);
  // Rangkaian trial bisa 2 sesi (Sabtu + Minggu): sebut semuanya.
  const when = sessionTimes.length ? sessionTimes.map((t) => `${formatDateTime(t)} WIB`).join(" dan ") : batch.start_date;

  await notifyAdmin(
    `Pendaftar kelas trial: ${input.full_name}`,
    [
      `${input.full_name} daftar ${batch.name} (${when}).`,
      `WhatsApp: https://wa.me/${input.whatsapp}`,
      `Email: ${input.email}`,
      `Instagram: ${input.instagram ? `@${input.instagram}` : "-"}`,
      `TikTok: ${input.tiktok ? `@${input.tiktok}` : "-"}`,
      `Tau dari: ${heardFromLabel(input.heard_from) ?? "-"}`,
    ].join("\n"),
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
      // Tanpa login: link Zoom langsung di email bila sudah diisi admin/sensei.
      batch.meeting_url
        ? `Link Zoom (sama untuk semua sesi): ${batch.meeting_url}`
        : "Link Zoom akan dikirim admin lewat WhatsApp sebelum kelas.",
      `Bisa juga lihat jadwal dan tombol Masuk kelas di ${siteUrl()}/masuk (opsional, pakai email ini, pilih "Kode dari email").`,
      "",
      "Sampai ketemu di kelas!",
      "Weltgakko",
    ].join("\n"),
  ).catch(() => {});

  return {
    ok: `Kursi kamu sudah aman untuk ${sessionTimes.length > 1 ? `${sessionTimes.length} sesi: ` : ""}${when}. Sekali daftar berlaku untuk semua sesinya. Konfirmasi${batch.meeting_url ? " dan link Zoom" : ""} sudah dikirim ke ${input.email}; admin juga akan menghubungi lewat WhatsApp sebelum kelas.`,
  };
}
