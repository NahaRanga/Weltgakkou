"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { findOrCreateProfile } from "@/lib/accounts";
import { createInvoice, seatsTaken } from "@/lib/billing";
import { registrationDeadline } from "@/lib/batches";
import { notifyAdmin } from "@/lib/email";
import { checkCode, sendCode, verificationEnabled, verifiedUserId } from "@/lib/email-verification";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { formatRupiah } from "@/lib/programs";

export type RegisterState = {
  error?: string;
  fieldErrors?: Partial<Record<(typeof fields)[number], string>>;
  values?: Record<string, string>;
};

const fields = [
  "full_name",
  "nickname",
  "gender",
  "birth_place_date",
  "domicile",
  "address",
  "education",
  "education_other",
  "occupation",
  "email",
  "whatsapp",
  "tiktok",
  "instagram",
  "studied_before",
  "prior_level",
  "learning_goal",
  "learning_goal_other",
  "plan",
  "referral_code",
  "agree",
] as const;

const optionalText = (max = 200) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => v || null);

const schema = z.object({
  full_name: z.string().trim().min(2, "Nama minimal 2 huruf").max(100),
  whatsapp: z
    .string()
    .trim()
    .transform((v) => v.replace(/[\s-]/g, ""))
    .pipe(z.string().regex(/^(\+62|62|0)8\d{7,12}$/, "Nomor WhatsApp tidak valid, contoh 081234567890"))
    .transform((v) => (v.startsWith("+62") ? "62" + v.slice(3) : v.startsWith("0") ? "62" + v.slice(1) : v)),
  email: z.email("Email wajib diisi, dipakai untuk login").transform((v) => v.toLowerCase()),
  nickname: optionalText(50),
  gender: z.enum(["laki-laki", "perempuan"]).nullable(),
  birth_place_date: optionalText(100),
  domicile: optionalText(100),
  address: optionalText(300),
  education: optionalText(100),
  occupation: optionalText(100),
  tiktok: z.string().trim().min(2, "Akun TikTok wajib diisi").max(100),
  instagram: optionalText(100),
  studied_before: z.enum(["sudah", "belum"], "Pilih salah satu").transform((v) => v === "sudah"),
  prior_level: optionalText(50),
  learning_goal: optionalText(100),
  plan: z.enum(["bulanan", "lunas"], "Pilih cara bayar"),
  referral_code: z.string().trim().toUpperCase().max(30).optional(),
  agree: z.literal("setuju", "Centang pernyataan untuk melanjutkan"),
});

const emailSchema = z.email().transform((v) => v.trim().toLowerCase());

// Langkah verifikasi email di formulir pendaftaran: kirim kode, lalu cocokkan kode.
export async function requestEmailCode(email: string) {
  const parsed = emailSchema.safeParse(email.trim());
  if (!parsed.success) return { error: "Tulis email yang valid dulu." };
  return sendCode(parsed.data);
}

export async function confirmEmailCode(email: string, code: string) {
  const parsed = emailSchema.safeParse(email.trim());
  if (!parsed.success) return { error: "Tulis email yang valid dulu." };
  if (!/^\d{6}$/.test(code.trim())) return { error: "Kode terdiri dari 6 angka." };
  return checkCode(parsed.data, code.trim());
}

export async function register(batchId: string, _prev: RegisterState, formData: FormData): Promise<RegisterState> {
  const values: Record<string, string> = Object.fromEntries(fields.map((k) => [k, String(formData.get(k) ?? "")]));
  // Pilihan "Lainnya" diisi lewat kolom teks tersendiri.
  const pick = (choice: string, other: string) => (choice === "lainnya" ? other : choice);
  const parsed = schema.safeParse({
    ...values,
    gender: values.gender || null,
    education: pick(values.education, values.education_other),
    learning_goal: pick(values.learning_goal, values.learning_goal_other),
    prior_level: values.studied_before === "sudah" ? values.prior_level : "",
    referral_code: values.referral_code || undefined,
  });
  if (!parsed.success) {
    const fieldErrors: RegisterState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof NonNullable<RegisterState["fieldErrors"]>;
      fieldErrors[key] ??= issue.message;
    }
    return { error: "Periksa lagi isian yang ditandai.", fieldErrors, values };
  }
  const input = parsed.data;
  const details = {
    nickname: input.nickname,
    gender: input.gender,
    birth_place_date: input.birth_place_date,
    domicile: input.domicile,
    address: input.address,
    education: input.education,
    occupation: input.occupation,
    tiktok: input.tiktok,
    instagram: input.instagram,
    studied_before: input.studied_before,
    prior_level: input.prior_level,
    learning_goal: input.learning_goal,
  };

  const db = getSupabaseAdmin();
  if (!db) return { error: "Pendaftaran sedang gangguan. Silakan hubungi kami lewat WhatsApp.", values };

  const { data: batch } = await db
    .from("batches")
    .select("*, programs(name, monthly_price, upfront_price, recording_price)")
    .eq("id", batchId)
    .maybeSingle();
  const program = batch?.programs as unknown as
    | { name: string; monthly_price: number | null; upfront_price: number | null; recording_price: number | null }
    | undefined;
  if (!batch || !program || batch.status !== "buka") return { error: "Batch ini sudah tidak menerima pendaftaran.", values };
  // Kelas trial didaftar lewat /trial; batch live tutup otomatis setelah tenggat (default H-1 23.59 WIB).
  if (batch.is_trial) return { error: "Kelas trial didaftar lewat halaman Kelas trial.", values };
  if (batch.mode === "live" && registrationDeadline(batch).getTime() < Date.now())
    return { error: "Pendaftaran batch ini sudah ditutup. Masuk waiting list untuk batch berikutnya.", values };

  // Paket rekaman selalu sekali bayar dengan harga paket rekaman.
  const isRecording = batch.mode === "rekaman";
  if (isRecording) input.plan = "lunas";
  const baseAmount = isRecording
    ? program.recording_price
    : input.plan === "bulanan"
      ? program.monthly_price
      : program.upfront_price;
  if (!baseAmount) return { error: "Cara bayar ini tidak tersedia untuk program ini.", values };

  // Dengan verifikasi aktif, akun dibuat Supabase saat kode dikirim; di sini cukup cek kodenya sudah benar.
  const verifiedId = verificationEnabled() ? await verifiedUserId(input.email) : null;
  if (verificationEnabled() && !verifiedId)
    return { error: "Verifikasi email dulu: klik Kirim kode, lalu masukkan kode dari email.", fieldErrors: { email: "Email belum diverifikasi" }, values };

  // Cari akun lama berdasarkan email, atau buat akun baru (password diatur setelah lunas).
  const account = await findOrCreateProfile(db, { email: input.email, full_name: input.full_name, whatsapp: input.whatsapp, details }, verifiedId);
  if ("error" in account) return { error: account.error, values };
  const { profileId } = account;

  // Pendaftar yang sama di batch yang sama: tampilkan lagi tagihannya.
  const { data: prior } = await db
    .from("enrollments")
    .select("id, status, invoices(code, status)")
    .eq("profile_id", profileId)
    .eq("batch_id", batchId)
    .maybeSingle();
  if (prior && prior.status !== "keluar") {
    const open = (prior.invoices as { code: string; status: string }[]).find((i) => i.status !== "kedaluwarsa");
    if (open) redirect(`/bayar/${open.code}`);
  }

  if (!isRecording && (await seatsTaken(db, batchId)) >= batch.quota) return { error: "Maaf, kuota batch ini sudah penuh.", values };

  let enrollmentId: string;
  if (prior) {
    enrollmentId = prior.id;
    await db.from("enrollments").update({ status: "menunggu_bayar", plan: input.plan, referral_code: input.referral_code ?? null, agreed_at: new Date().toISOString() }).eq("id", prior.id);
  } else {
    const { data: enrollment, error } = await db
      .from("enrollments")
      .insert({
        profile_id: profileId,
        batch_id: batchId,
        plan: input.plan,
        referral_code: input.referral_code ?? null,
        agreed_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (error) throw error;
    enrollmentId = enrollment.id;
  }

  const code = await createInvoice(db, { enrollmentId, baseAmount, installmentNo: 1, dueInHours: 24 });
  await db.from("leads").update({ status: "daftar" }).eq("whatsapp", input.whatsapp).in("status", ["baru", "dihubungi"]);

  await notifyAdmin(
    `Pendaftar baru: ${input.full_name} (${program.name})`,
    `${input.full_name} mendaftar ${program.name}, ${isRecording ? "paket rekaman" : batch.name}.\nCara bayar: ${input.plan}, tagihan pertama ${formatRupiah(baseAmount)} + kode unik.\nWhatsApp: https://wa.me/${input.whatsapp}\nKode tagihan: ${code}`,
  ).catch(() => {});

  redirect(`/bayar/${code}`);
}

