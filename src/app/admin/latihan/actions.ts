"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import type { FormState } from "@/app/admin/types";
import { requireAdmin, requireDb } from "@/lib/auth";
import { sections, type Section } from "@/lib/quiz";

// Slug yang dipakai rute statis di /latihan, jadi tidak boleh dipakai tes.
const reserved = ["akun", "kana", "kerjakan", "hasil"];

const quizSchema = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().max(300).optional().transform((v) => v || null),
  duration_minutes: z.coerce.number().int().min(1).max(180),
});

export async function createQuiz(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = quizSchema
    .extend({ slug: z.string().trim().toLowerCase().regex(/^[a-z0-9-]{3,40}$/), kind: z.enum(["penempatan", "tryout"]) })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Periksa lagi: judul, slug (huruf kecil, angka, tanda -), jenis, dan durasi menit." };
  if (reserved.includes(parsed.data.slug)) return { error: `Slug "${parsed.data.slug}" sudah dipakai halaman lain.` };
  const db = requireDb();
  const { count } = await db.from("quizzes").select("id", { count: "exact", head: true });
  const { error } = await db.from("quizzes").insert({ ...parsed.data, position: (count ?? 0) + 1 });
  if (error) return { error: error.code === "23505" ? "Slug sudah dipakai tes lain." : error.message };
  refresh();
  return { ok: `Tes "${parsed.data.title}" dibuat. Tambahkan soalnya, lalu centang Tampilkan.` };
}

export async function updateQuiz(quizId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = quizSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Periksa lagi judul dan durasi (1–180 menit)." };
  const db = requireDb();
  const published = formData.get("published") === "1";
  if (published) {
    const { count } = await db.from("quiz_questions").select("id", { count: "exact", head: true }).eq("quiz_id", quizId);
    if (!count) return { error: "Tes tanpa soal tidak bisa ditampilkan." };
  }
  await db.from("quizzes").update({ ...parsed.data, published }).eq("id", quizId);
  refresh();
  return { ok: published ? "Disimpan. Tes tampil di /latihan." : "Disimpan. Tes disembunyikan dari pengunjung." };
}

type QuestionInput = {
  section: Section;
  prompt: string;
  choices: string[];
  answer: number;
  explanation: string | null;
  image_url: string | null;
  audio_url: string | null;
  preview: boolean;
};

const sectionAliases: Record<string, Section> = {
  kosakata: "kosakata",
  huruf: "kosakata",
  "huruf & kosakata": "kosakata",
  "tata bahasa": "tata_bahasa",
  tata_bahasa: "tata_bahasa",
  percakapan: "percakapan",
  "percakapan & ungkapan": "percakapan",
  mendengar: "mendengar",
  membaca: "membaca",
};

const httpsOrNull = (v: string) => (/^https:\/\/\S+$/.test(v) ? v : null);

function toQuestion(raw: Record<string, string>): QuestionInput | string {
  const section = sectionAliases[(raw.bagian ?? "").trim().toLowerCase()];
  if (!section) return `bagian "${raw.bagian ?? ""}" tidak dikenal (pakai: ${sections.join(", ")})`;
  const prompt = (raw.soal ?? "").trim();
  if (prompt.length < 2) return "kolom soal kosong";
  const choices = ["a", "b", "c", "d"].map((k) => (raw[k] ?? "").trim()).filter(Boolean);
  if (choices.length < 2) return "minimal 2 pilihan (A dan B)";
  const answer = "ABCD".indexOf((raw.jawaban ?? "").trim().toUpperCase());
  if (answer < 0 || answer >= choices.length) return `jawaban "${raw.jawaban ?? ""}" harus A–${"ABCD"[choices.length - 1]}`;
  return {
    section,
    prompt,
    choices,
    answer,
    explanation: (raw.pembahasan ?? "").trim() || null,
    image_url: httpsOrNull((raw.gambar ?? "").trim()),
    audio_url: httpsOrNull((raw.audio ?? "").trim()),
    preview: /^(1|ya|y|true)$/i.test((raw.contoh ?? "").trim()),
  };
}

export async function addQuestion(quizId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const raw = Object.fromEntries([...formData.entries()].map(([k, v]) => [k, String(v)]));
  const q = toQuestion(raw);
  if (typeof q === "string") return { error: `Periksa lagi: ${q}.` };
  const db = requireDb();
  const { count } = await db.from("quiz_questions").select("id", { count: "exact", head: true }).eq("quiz_id", quizId);
  const { error } = await db.from("quiz_questions").insert({ ...q, quiz_id: quizId, position: (count ?? 0) + 1 });
  if (error) return { error: error.message };
  refresh();
  return { ok: "Soal ditambahkan." };
}

export async function deleteQuestion(questionId: string) {
  await requireAdmin();
  await requireDb().from("quiz_questions").delete().eq("id", questionId);
  refresh();
}

// CSV dari Excel/Google Sheets: pemisah ; atau , dan sel boleh diapit tanda kutip.
function parseCsv(text: string) {
  const clean = text.replace(/^﻿/, "");
  const firstLine = clean.split(/\r?\n/, 1)[0] ?? "";
  const sep = (firstLine.match(/;/g)?.length ?? 0) >= (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < clean.length; i++) {
    const c = clean[i];
    if (quoted) {
      if (c === '"' && clean[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === sep) {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && clean[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (cell || row.length) rows.push([...row, cell]);
  return rows.filter((r) => r.some((v) => v.trim()));
}

export async function importQuestions(quizId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const file = formData.get("file");
  const text = file instanceof File && file.size ? await file.text() : String(formData.get("text") ?? "");
  if (text.length > 500_000) return { error: "File terlalu besar (maks 500 KB)." };
  const rows = parseCsv(text);
  if (rows.length < 2) return { error: "CSV kosong. Baris pertama judul kolom, soal mulai baris kedua." };
  const header = rows[0].map((h) => h.trim().toLowerCase());
  for (const need of ["bagian", "soal", "a", "b", "jawaban"]) {
    if (!header.includes(need)) return { error: `Kolom "${need}" tidak ada di baris judul.` };
  }
  const questions: QuestionInput[] = [];
  for (const [i, r] of rows.slice(1).entries()) {
    const q = toQuestion(Object.fromEntries(header.map((h, j) => [h, r[j] ?? ""])));
    if (typeof q === "string") return { error: `Baris ${i + 2}: ${q}. Belum ada soal yang disimpan.` };
    questions.push(q);
  }
  if (questions.length > 200) return { error: "Maksimal 200 soal per impor." };

  const db = requireDb();
  if (formData.get("replace_samples") === "1") {
    await db.from("quiz_questions").delete().eq("quiz_id", quizId).like("prompt", "[CONTOH]%");
  }
  const { count } = await db.from("quiz_questions").select("id", { count: "exact", head: true }).eq("quiz_id", quizId);
  const start = count ?? 0;
  const { error } = await db.from("quiz_questions").insert(questions.map((q, i) => ({ ...q, quiz_id: quizId, position: start + i + 1 })));
  if (error) return { error: error.message };
  refresh();
  return { ok: `${questions.length} soal diimpor.` };
}

// Tanda hadir kelas trial: membuka tingkatan "trial" di zona latihan.
export async function setTrialAttended(profileId: string, attended: boolean) {
  await requireAdmin();
  await requireDb()
    .from("profiles")
    .update({ trial_attended_at: attended ? new Date().toISOString() : null })
    .eq("id", profileId);
  refresh();
}
