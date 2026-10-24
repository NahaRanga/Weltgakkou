import type { SupabaseClient } from "@supabase/supabase-js";
import type { CurrentUser } from "@/lib/auth";

// Zona latihan gratis (rencana P13–P14). Soal ada di tabel quiz_questions, diisi admin.
// Tanpa server-only: label dan tipe juga dipakai komponen browser di components/latihan.tsx.

export type QuizKind = "penempatan" | "tryout";
export type Section = "kosakata" | "tata_bahasa" | "percakapan" | "mendengar" | "membaca";

export const sectionLabels: Record<Section, string> = {
  kosakata: "Huruf & kosakata",
  tata_bahasa: "Tata bahasa",
  percakapan: "Percakapan & ungkapan",
  mendengar: "Mendengar",
  membaca: "Membaca",
};
export const sections = Object.keys(sectionLabels) as Section[];

export const kindLabels: Record<QuizKind, string> = { penempatan: "Tes penempatan", tryout: "Mini tryout" };

export type Quiz = {
  id: string;
  slug: string;
  kind: QuizKind;
  title: string;
  description: string | null;
  duration_minutes: number;
  published: boolean;
  position: number;
};

export type Question = {
  id: string;
  section: Section;
  position: number;
  prompt: string;
  image_url: string | null;
  audio_url: string | null;
  choices: string[];
  answer: number;
  explanation: string | null;
  preview: boolean;
};

// Soal yang dikirim ke browser saat tes berjalan: tanpa kunci jawaban dan pembahasan.
export type PublicQuestion = Pick<Question, "id" | "section" | "prompt" | "image_url" | "audio_url" | "choices">;
export const toPublic = ({ id, section, prompt, image_url, audio_url, choices }: Question): PublicQuestion => ({
  id,
  section,
  prompt,
  image_url,
  audio_url,
  choices,
});

export type Attempt = {
  id: string;
  quiz_id: string;
  profile_id: string;
  started_at: string;
  submitted_at: string | null;
  score: number | null;
  total: number | null;
  section_scores: Partial<Record<Section, [number, number]>> | null;
  answers: Record<string, number> | null;
};

// Tingkatan akses (keputusan winata 2026-10-18: akun yang cuma login dapat sedikit saja,
// supaya tetap butuh ikut kelas).
export type Tier = "gratis" | "trial" | "siswa";

export const tierLabels: Record<Tier, string> = {
  gratis: "Akun gratis",
  trial: "Peserta kelas trial",
  siswa: "Siswa Weltgakko",
};

export async function tierFor(db: SupabaseClient, user: CurrentUser): Promise<Tier> {
  // Tim internal boleh mencoba semua tanpa batas.
  if (user.role !== "siswa") return "siswa";
  // Siswa = pernah aktif di batch berbayar. Kelas trial (batches.is_trial, migrasi 0005) tidak dihitung.
  const [paid, trialAttendance, { data: profile }] = await Promise.all([
    db
      .from("enrollments")
      .select("id, batches!inner(is_trial)", { count: "exact", head: true })
      .eq("profile_id", user.id)
      .in("status", ["aktif", "selesai"])
      .eq("batches.is_trial", false),
    db
      .from("attendance")
      .select("session_id, sessions!inner(batches!inner(is_trial))", { count: "exact", head: true })
      .eq("profile_id", user.id)
      .eq("sessions.batches.is_trial", true),
    db.from("profiles").select("trial_attended_at").eq("id", user.id).maybeSingle(),
  ]);
  if (paid.count) return "siswa";
  // Peserta trial: tercatat hadir di kelas trial (tombol Masuk kelas) atau ditandai admin.
  return trialAttendance.count || profile?.trial_attended_at ? "trial" : "gratis";
}

// Jatah percobaan per tes. Peserta trial dapat 1× ulang tryout.
export function attemptLimit(tier: Tier, kind: QuizKind) {
  if (tier === "siswa") return Infinity;
  if (tier === "trial" && kind === "tryout") return 2;
  return 1;
}

// Berapa soal yang boleh dilihat pembahasannya di halaman hasil.
export function explanationLimit(tier: Tier) {
  return tier === "siswa" ? Infinity : tier === "trial" ? 3 : 0;
}

// Waktu tambahan setelah timer habis untuk koneksi lambat sebelum jawaban ditolak.
export const GRACE_MS = 2 * 60_000;

export function deadlineOf(attempt: Pick<Attempt, "started_at">, quiz: Pick<Quiz, "duration_minutes">) {
  return new Date(attempt.started_at).getTime() + quiz.duration_minutes * 60_000;
}

export function grade(questions: Question[], answers: Record<string, number>) {
  const section_scores: Partial<Record<Section, [number, number]>> = {};
  let score = 0;
  for (const q of questions) {
    const s = (section_scores[q.section] ??= [0, 0]);
    s[1] += 1;
    if (answers[q.id] === q.answer) {
      s[0] += 1;
      score += 1;
    }
  }
  return { score, total: questions.length, section_scores };
}

export const percent = (score: number | null, total: number | null) => (total ? Math.round(((score ?? 0) / total) * 100) : 0);

// Saran program dari hasil tes. Ambang awal, bisa disetel lagi bersama Nurdin.
export function recommendation(kind: QuizKind, pct: number): { slug: string; title: string; text: string } {
  if (kind === "penempatan") {
    if (pct < 40) return { slug: "kiso", title: "Mulai dari Kiso", text: "Kuatkan dasar huruf hiragana, katakana, dan kosakata sehari-hari dulu, baru lanjut ke N5." };
    if (pct < 75) return { slug: "jlpt-n5", title: "Cocok di kelas JLPT N5", text: "Dasarnya sudah ada. Di N5 kamu merapikan tata bahasa dan kosakata sampai siap ujian." };
    return { slug: "jlpt-n4", title: "Cocok di kelas JLPT N4", text: "Kemampuanmu sudah di atas dasar. Lanjut ke N4 supaya tidak mengulang materi yang sudah kamu kuasai." };
  }
  if (pct < 50) return { slug: "jlpt-n5", title: "Perkuat dasar dulu", text: "Banyak soal JFT-Basic butuh dasar N5 yang kuat. Kelas N5 membantumu mengejarnya." };
  if (pct < 80) return { slug: "jft-basic", title: "Sudah dekat, latih format JFT", text: "Dasarmu cukup. Kelas JFT-Basic melatih tipe soal dan waktu sampai kamu siap ujian." };
  return { slug: "jft-basic", title: "Siap tancap gas ke JFT-Basic", text: "Hasilmu bagus. Pertahankan dengan latihan rutin dan simulasi penuh di kelas JFT-Basic." };
}

// Pilihan pertanyaan awal. Disimpan sebagai teks di profiles.
export const goalOptions = ["Kerja di Jepang (SSW/Tokutei Ginou)", "Magang di Jepang", "Kuliah di Jepang", "Lulus JLPT", "Hobi / anime / wisata"];
export const levelOptions = ["Belum bisa sama sekali", "Bisa hiragana/katakana", "Setara N5", "Setara N4 atau lebih"];
export const sswOptions = [
  "Belum tahu",
  "Perawat lansia (kaigo)",
  "Pengolahan makanan",
  "Restoran",
  "Pertanian",
  "Konstruksi",
  "Manufaktur",
  "Perhotelan",
  "Lainnya",
];
