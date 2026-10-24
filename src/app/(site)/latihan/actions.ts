"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { findOrCreateProfile } from "@/lib/accounts";
import { getCurrentUser, requireDb } from "@/lib/auth";
import { sendCode } from "@/lib/email-verification";
import { attemptLimit, deadlineOf, GRACE_MS, goalOptions, grade, levelOptions, sswOptions, tierFor, type Attempt, type Question, type Quiz } from "@/lib/quiz";
import { getSupabaseAuth } from "@/lib/supabase-server";

export type LoginState = { error?: string; step?: "code"; email?: string; full_name?: string; whatsapp?: string; redirectTo?: string };
export type ActionResult = { error?: string; redirectTo?: string };

const loginSchema = z.object({
  full_name: z.string().trim().min(2, "Nama minimal 2 huruf").max(100),
  whatsapp: z
    .string()
    .trim()
    .transform((v) => v.replace(/[\s-]/g, ""))
    .pipe(z.string().regex(/^(\+62|62|0)8\d{7,12}$/, "Nomor WhatsApp tidak valid, contoh 081234567890"))
    .transform((v) => (v.startsWith("+62") ? "62" + v.slice(3) : v.startsWith("0") ? "62" + v.slice(1) : v)),
  email: z.email("Email tidak valid").transform((v) => v.toLowerCase()),
});

// Akun gratis untuk zona latihan: nama + WhatsApp + email, masuk dengan kode 6 digit dari email
// (tanpa password). Langkah 1 kirim kode, langkah 2 cek kode lalu sesi login dipasang di browser.
export async function practiceLogin(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(["full_name", "whatsapp", "email"].map((k) => [k, String(formData.get(k) ?? "")])));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Periksa lagi isian kamu." };
  const input = parsed.data;
  const code = String(formData.get("code") ?? "").replace(/\D/g, "");

  if (!code) {
    const sent = await sendCode(input.email);
    if (sent.error) return { error: sent.error };
    return { step: "code", ...input };
  }

  const auth = await getSupabaseAuth();
  if (!auth) return { error: "Login belum aktif. Hubungi admin." };
  const { data, error } = await auth.auth.verifyOtp({ email: input.email, token: code, type: "email" });
  if (error || !data.user) return { step: "code", ...input, error: "Kode salah atau sudah kedaluwarsa. Minta kode baru bila perlu." };

  // Akun dari pendaftaran kelas/trial dengan email sama dipakai ulang; selain itu profil baru.
  const result = await findOrCreateProfile(requireDb(), input, data.user.id).catch((e) => {
    console.error("Gagal membuat profil akun latihan", e);
    return { error: "Akun gagal dibuat. Coba lagi atau hubungi admin lewat WhatsApp." };
  });
  if ("error" in result) return { error: result.error };
  return { redirectTo: "/latihan" };
}

const onboardingSchema = z.object({
  learning_goal: z.enum(goalOptions),
  prior_level: z.enum(levelOptions),
  ssw_field: z.enum(sswOptions),
  been_to_japan: z.enum(["ya", "tidak"]),
});

export async function saveOnboarding(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "Sesi login habis. Masuk lagi." };
  const parsed = onboardingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Jawab keempat pertanyaan dulu, ya." };
  const { been_to_japan, ...rest } = parsed.data;
  // Akun dari login Google belum punya nomor WhatsApp: formnya menampilkan kolom WA dan wajib diisi.
  const extra: { whatsapp?: string } = {};
  if (formData.has("whatsapp")) {
    const wa = loginSchema.shape.whatsapp.safeParse(String(formData.get("whatsapp") ?? ""));
    if (!wa.success) return { error: wa.error.issues[0]?.message ?? "Nomor WhatsApp tidak valid." };
    extra.whatsapp = wa.data;
  }
  const db = requireDb();
  await db
    .from("profiles")
    .update({ ...rest, ...extra, been_to_japan: been_to_japan === "ya", practice_onboarded_at: new Date().toISOString() })
    .eq("id", user.id);
  refresh();
  return {};
}

// Mulai tes: lanjutkan percobaan yang masih berjalan, atau buat baru bila jatah masih ada.
export async function startAttempt(quizId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { redirectTo: "/latihan/akun" };
  const db = requireDb();
  const [{ data: quiz }, { data: profile }] = await Promise.all([
    db.from("quizzes").select("id, kind, published, duration_minutes").eq("id", quizId).maybeSingle(),
    db.from("profiles").select("practice_onboarded_at").eq("id", user.id).maybeSingle(),
  ]);
  const staff = user.role !== "siswa";
  if (!quiz || (!quiz.published && !staff)) return { error: "Tes ini belum dibuka." };
  if (!profile?.practice_onboarded_at && !staff) return { error: "Isi pertanyaan awal di halaman latihan dulu." };

  const { data: attempts } = await db.from("quiz_attempts").select("id, started_at, submitted_at").eq("quiz_id", quizId).eq("profile_id", user.id);
  const running = (attempts ?? []).find((a) => !a.submitted_at && Date.now() < deadlineOf(a, quiz) + GRACE_MS);
  if (running) return { redirectTo: `/latihan/kerjakan/${running.id}` };

  const tier = await tierFor(db, user);
  if ((attempts ?? []).length >= attemptLimit(tier, quiz.kind)) {
    return { error: "Jatah tes ini sudah terpakai. Ulang tanpa batas dan pembahasan lengkap khusus siswa Weltgakko." };
  }
  const { data: created, error } = await db.from("quiz_attempts").insert({ quiz_id: quizId, profile_id: user.id }).select("id").single();
  if (error || !created) return { error: "Tes gagal dimulai. Coba lagi." };
  return { redirectTo: `/latihan/kerjakan/${created.id}` };
}

export async function submitAttempt(attemptId: string, rawAnswers: Record<string, number>): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "Sesi login habis. Masuk lagi, jawabanmu belum terkirim." };
  const db = requireDb();
  const { data } = await db.from("quiz_attempts").select("id, quiz_id, profile_id, started_at, submitted_at, quizzes(duration_minutes)").eq("id", attemptId).maybeSingle();
  const attempt = data as unknown as (Attempt & { quizzes: Pick<Quiz, "duration_minutes"> }) | null;
  if (!attempt || attempt.profile_id !== user.id) return { error: "Tes tidak ditemukan." };
  if (attempt.submitted_at) return { redirectTo: `/latihan/hasil/${attemptId}` };

  const { data: rows } = await db.from("quiz_questions").select("id, section, choices, answer").eq("quiz_id", attempt.quiz_id);
  const questions = (rows ?? []) as Question[];
  // Lewat batas waktu (plus toleransi): jawaban yang terlambat tidak dihitung.
  const late = Date.now() > deadlineOf(attempt, attempt.quizzes) + GRACE_MS;
  const answers: Record<string, number> = {};
  if (!late) {
    for (const q of questions) {
      const a = rawAnswers?.[q.id];
      if (Number.isInteger(a) && a >= 0 && a < q.choices.length) answers[q.id] = a;
    }
  }
  const result = grade(questions, answers);
  await db
    .from("quiz_attempts")
    .update({ ...result, answers, submitted_at: new Date().toISOString() })
    .eq("id", attemptId)
    .is("submitted_at", null);
  return { redirectTo: `/latihan/hasil/${attemptId}` };
}
