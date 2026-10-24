"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireBatchStaff, requireSessionStaff } from "@/app/admin/guards";
import type { BatchState, FormState } from "@/app/admin/types";
import { requireAdmin, requireDb, requireStaff } from "@/lib/auth";

// Isian datetime-local (jam WIB) → ISO; kosong = tenggat default (H-1 23.59 WIB).
const deadlineField = z
  .union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)])
  .optional()
  .transform((v) => (v ? new Date(`${v}:00+07:00`).toISOString() : null));

const batchSchema = z.object({
  program_id: z.uuid(),
  name: z.string().trim().min(2).max(80),
  start_date: z.iso.date(),
  start_time: z.string().regex(/^\d{2}:\d{2}$/),
  weeks: z.coerce.number().int().min(1).max(52),
  class_days: z.array(z.coerce.number().int().min(1).max(6)).min(1),
  exam_day: z.coerce.number().int().min(0).max(6),
  quota: z.coerce.number().int().min(1).max(50),
  meeting_url: z.union([z.literal(""), z.url()]),
  schedule_label: z.string().trim().min(2).max(120),
  is_trial: z.literal("1").optional(),
  registration_deadline: deadlineField,
});

// Membuat batch beserta seluruh sesinya: hari kelas (default Senin-Kamis) dan
// ujian mingguan (default Jumat), jam WIB, selama jumlah minggu yang dipilih.
export async function createBatch(_prev: BatchState, formData: FormData): Promise<BatchState> {
  await requireAdmin();
  const parsed = batchSchema.safeParse({
    ...Object.fromEntries(formData),
    class_days: formData.getAll("class_days"),
    is_trial: formData.get("is_trial") ?? undefined,
  });
  if (!parsed.success) return { error: "Periksa lagi isian batch: " + parsed.error.issues.map((i) => i.path.join(".")).join(", ") };
  const b = parsed.data;
  const db = requireDb();

  const { data: batch, error } = await db
    .from("batches")
    .insert({
      program_id: b.program_id,
      name: b.name,
      start_date: b.start_date,
      schedule_label: b.schedule_label,
      quota: b.quota,
      meeting_url: b.meeting_url || null,
      // Kolom dari migrasi 0005 hanya dikirim bila dipakai, supaya buat batch biasa tetap jalan sebelum migrasi.
      ...(b.is_trial ? { is_trial: true } : {}),
      ...(b.registration_deadline ? { registration_deadline: b.registration_deadline } : {}),
    })
    .select("id")
    .single();
  if (error) return { error: error.message.includes("is_trial") || error.message.includes("registration_deadline") ? "Jalankan dulu migrasi 0005_trial_tenggat.sql di SQL Editor Supabase." : error.message };

  // Kelas trial: satu pertemuan saja di tanggal dan jam mulai.
  if (b.is_trial) {
    const { error: sessionError } = await db
      .from("sessions")
      .insert({ batch_id: batch.id, number: 1, starts_at: new Date(`${b.start_date}T${b.start_time}:00+07:00`).toISOString(), kind: "kelas", topic: "Kelas trial gratis" });
    if (sessionError) return { error: sessionError.message };
    refresh();
    return { ok: "Kelas trial dibuat dengan 1 sesi. Isi link Zoom di detail batch." };
  }

  const sessions: { batch_id: string; number: number; starts_at: string; kind: "kelas" | "ujian"; topic: string | null }[] = [];
  const start = new Date(`${b.start_date}T${b.start_time}:00+07:00`);
  const startDay = new Date(`${b.start_date}T12:00:00+07:00`).getUTCDay();
  // Mundur ke hari Senin minggu pertama, lalu jalan per minggu.
  const monday = new Date(start.getTime() - ((startDay + 6) % 7) * 86400_000);
  let n = 0;
  for (let w = 0; w < b.weeks; w++) {
    const days: { d: number; kind: "kelas" | "ujian" }[] = b.class_days.map((d) => ({ d, kind: "kelas" }));
    if (b.exam_day) days.push({ d: b.exam_day, kind: "ujian" });
    days.sort((x, y) => x.d - y.d);
    for (const { d, kind } of days) {
      const at = new Date(monday.getTime() + (w * 7 + d - 1) * 86400_000);
      if (at < start) continue;
      n += 1;
      sessions.push({ batch_id: batch.id, number: n, starts_at: at.toISOString(), kind, topic: kind === "ujian" ? `Ujian minggu ${w + 1}` : null });
    }
  }
  if (sessions.length) {
    const { error: sessionError } = await db.from("sessions").insert(sessions);
    if (sessionError) return { error: sessionError.message };
  }
  refresh();
  return { ok: `Batch dibuat dengan ${sessions.length} sesi.` };
}

export async function setBatchStatus(batchId: string, status: "buka" | "berjalan" | "selesai") {
  await requireAdmin();
  await requireDb().from("batches").update({ status }).eq("id", batchId);
  refresh();
}

// Link kelas (Zoom/Meet) untuk satu batch; diisi admin atau sensei batch itu. Sesi tanpa link sendiri memakai link ini.
export async function setBatchMeetingUrl(batchId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireBatchStaff(batchId);
  const url = String(formData.get("meeting_url") ?? "").trim();
  if (url && !/^https:\/\/\S+$/.test(url)) return { error: "Link harus diawali https://, contoh https://zoom.us/j/1234567890" };
  const { error } = await requireDb().from("batches").update({ meeting_url: url || null }).eq("id", batchId);
  if (error) return { error: error.message };
  refresh();
  return { ok: url ? "Link kelas disimpan. Siswa bisa masuk lewat tombol Masuk kelas." : "Link kelas dihapus." };
}

// Link grup WhatsApp batch; diisi admin atau sensei batch itu. Tampil sebagai tombol di area belajar siswa yang sudah aktif.
export async function setBatchWhatsappUrl(batchId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireBatchStaff(batchId);
  const url = String(formData.get("whatsapp_group_url") ?? "").trim();
  if (url && !/^https:\/\/chat\.whatsapp\.com\/\S+$/.test(url)) {
    return { error: "Pakai link undangan grup, contoh https://chat.whatsapp.com/AbCdEf123 (WhatsApp > info grup > Undang lewat link)." };
  }
  const { error } = await requireDb().from("batches").update({ whatsapp_group_url: url || null }).eq("id", batchId);
  if (error) {
    if (error.message.includes("whatsapp_group_url")) return { error: "Kolom grup WA belum ada. Jalankan dulu migrasi 0010_grup_wa.sql di SQL Editor Supabase." };
    return { error: error.message };
  }
  refresh();
  return { ok: url ? "Link grup WA disimpan. Siswa aktif sekarang lihat tombol Gabung grup WhatsApp." : "Link grup WA dihapus." };
}

const batchUpdateSchema = z.object({
  name: z.string().trim().min(2).max(80),
  schedule_label: z.string().trim().min(2).max(120),
  quota: z.coerce.number().int().min(1).max(50),
  teacher_id: z.union([z.literal(""), z.uuid()]),
  registration_deadline: deadlineField,
});

export async function updateBatch(batchId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = batchUpdateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Periksa lagi isian: " + parsed.error.issues.map((i) => i.path.join(".")).join(", ") };
  const b = parsed.data;
  const { error } = await requireDb()
    .from("batches")
    .update({
      name: b.name,
      schedule_label: b.schedule_label,
      quota: b.quota,
      teacher_id: b.teacher_id || null,
      // Field tenggat hanya ada di form bila kolomnya sudah ada (migrasi 0005).
      ...(formData.has("registration_deadline") ? { registration_deadline: b.registration_deadline } : {}),
    })
    .eq("id", batchId);
  if (error) return { error: error.message };
  refresh();
  return { ok: "Batch disimpan." };
}

export async function updateSession(sessionId: string, formData: FormData) {
  await requireSessionStaff(sessionId);
  const topic = String(formData.get("topic") ?? "").trim().slice(0, 120);
  const meetingUrl = String(formData.get("meeting_url") ?? "").trim();
  const recordingUrl = String(formData.get("recording_url") ?? "").trim();
  if ([meetingUrl, recordingUrl].some((u) => u && !/^https:\/\/\S+$/.test(u))) return;
  await requireDb()
    .from("sessions")
    .update({ topic: topic || null, meeting_url: meetingUrl || null, recording_url: recordingUrl || null })
    .eq("id", sessionId);
  refresh();
}

// Absensi: baris di tabel attendance berarti hadir (sama seperti tombol "Masuk kelas" siswa).
export async function saveAttendance(sessionId: string, studentIds: string[], formData: FormData) {
  await requireSessionStaff(sessionId);
  const db = requireDb();
  const present = new Set(formData.getAll("present").map(String));
  const absent = studentIds.filter((id) => !present.has(id));
  if (present.size) {
    await db
      .from("attendance")
      .upsert([...present].map((profile_id) => ({ session_id: sessionId, profile_id, present: true })), { onConflict: "session_id,profile_id" });
  }
  if (absent.length) await db.from("attendance").delete().eq("session_id", sessionId).in("profile_id", absent);
  refresh();
}

// Nilai ujian per sesi ujian. Baris exams dibuat otomatis saat nilai pertama disimpan.
export async function saveExamScores(sessionId: string, formData: FormData) {
  await requireSessionStaff(sessionId);
  const db = requireDb();
  const maxScore = Math.max(1, Number(formData.get("max_score") ?? 100) || 100);
  const { data: session } = await db.from("sessions").select("topic, number").eq("id", sessionId).maybeSingle();
  if (!session) return;
  let { data: exam } = await db.from("exams").select("id").eq("session_id", sessionId).maybeSingle();
  if (!exam) {
    const { data } = await db
      .from("exams")
      .insert({ session_id: sessionId, title: session.topic ?? `Ujian sesi ${session.number}`, max_score: maxScore })
      .select("id")
      .single();
    exam = data;
  } else {
    await db.from("exams").update({ max_score: maxScore }).eq("id", exam.id);
  }
  if (!exam) return;
  const rows: { exam_id: string; profile_id: string; score: number }[] = [];
  const cleared: string[] = [];
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("score_")) continue;
    const profileId = key.slice(6);
    const raw = String(value).trim().replace(",", ".");
    if (raw === "") cleared.push(profileId);
    else if (!Number.isNaN(Number(raw))) rows.push({ exam_id: exam.id, profile_id: profileId, score: Math.min(maxScore, Math.max(0, Number(raw))) });
  }
  if (rows.length) await db.from("exam_results").upsert(rows, { onConflict: "exam_id,profile_id" });
  if (cleared.length) await db.from("exam_results").delete().eq("exam_id", exam.id).in("profile_id", cleared);
  refresh();
}

const materialSchema = z.object({
  title: z.string().trim().min(2).max(120),
  kind: z.enum(["pdf", "video", "link"]),
  url: z.url(),
  session_id: z.union([z.literal(""), z.uuid()]),
});

export async function addMaterial(batchId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireBatchStaff(batchId);
  const { data: batch } = await requireDb().from("batches").select("program_id").eq("id", batchId).maybeSingle();
  if (!batch) return { error: "Batch tidak ditemukan." };
  const programId = batch.program_id as string;
  const parsed = materialSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Isi judul dan link yang valid (diawali https://)." };
  const m = parsed.data;
  // Materi untuk semua batch satu program hanya boleh dibuat admin.
  if (!m.session_id && user.role !== "admin") return { error: "Pilih sesi untuk materi ini." };
  if (m.session_id) {
    const { data: session } = await requireDb().from("sessions").select("batch_id").eq("id", m.session_id).maybeSingle();
    if (session?.batch_id !== batchId) return { error: "Sesi tidak ditemukan di batch ini." };
  }
  const { error } = await requireDb()
    .from("materials")
    .insert({ title: m.title, kind: m.kind, url: m.url, session_id: m.session_id || null, program_id: m.session_id ? null : programId });
  if (error) return { error: error.message };
  refresh();
  return { ok: "Materi ditambahkan." };
}

export async function deleteMaterial(materialId: string) {
  const user = await requireStaff();
  const db = requireDb();
  if (user.role !== "admin") {
    const { data } = await db.from("materials").select("sessions(batch_id)").eq("id", materialId).maybeSingle();
    const batchId = (data?.sessions as unknown as { batch_id: string } | null)?.batch_id;
    if (!batchId) return;
    await requireBatchStaff(batchId);
  }
  await db.from("materials").delete().eq("id", materialId);
  refresh();
}
