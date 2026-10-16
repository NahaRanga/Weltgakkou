"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { createPasswordLink } from "@/app/masuk/actions";
import { requireAdmin, requireDb } from "@/lib/auth";
import { createInvoice } from "@/lib/billing";
import { sendEmail } from "@/lib/email";
import { formatDate, siteUrl } from "@/lib/format";
import { formatRupiah } from "@/lib/programs";

export type VerifyState = { done?: "accepted" | "rejected"; error?: string; whatsappText?: string; whatsapp?: string };

const REFERRAL_PERCENT = Number(process.env.REFERRAL_PERCENT ?? 10);

type InvoiceRow = {
  id: string;
  code: string;
  amount: number;
  unique_code: number;
  status: string;
  installment_no: number;
  enrollments: {
    id: string;
    status: string;
    referral_code: string | null;
    profile_id: string;
    profiles: { full_name: string; email: string; whatsapp: string | null };
    batches: { name: string; start_date: string; schedule_label: string; programs: { name: string } };
  };
};

export async function acceptPayment(invoiceId: string): Promise<VerifyState> {
  const admin = await requireAdmin();
  const db = requireDb();

  const { data } = await db
    .from("invoices")
    .select(
      "id, code, amount, unique_code, status, installment_no, enrollments(id, status, referral_code, profile_id, profiles(full_name, email, whatsapp), batches(name, start_date, schedule_label, programs(name)))",
    )
    .eq("id", invoiceId)
    .maybeSingle();
  const invoice = data as unknown as InvoiceRow | null;
  if (!invoice || invoice.status !== "menunggu_verifikasi") return { error: "Tagihan ini sudah diproses." };

  const now = new Date().toISOString();
  await db.from("invoices").update({ status: "lunas", paid_at: now }).eq("id", invoice.id);
  await db
    .from("payment_proofs")
    .update({ verified_by: admin.id, verified_at: now })
    .eq("invoice_id", invoice.id)
    .is("verified_at", null);

  const enrollment = invoice.enrollments;
  const student = enrollment.profiles;
  const batch = enrollment.batches;
  const firstPayment = enrollment.status === "menunggu_bayar";

  if (firstPayment) {
    await db.from("enrollments").update({ status: "aktif" }).eq("id", enrollment.id);
    await recordReferral(enrollment.referral_code, enrollment.profile_id, enrollment.id, invoice.amount - invoice.unique_code);
  }
  // Tanpa refresh(): kartu verifikasi harus tetap tampil supaya admin bisa
  // menyalin pesan WhatsApp berisi link login.

  // Siswa baru menerima link untuk membuat password; siswa lama cukup diberi tahu.
  const link = firstPayment ? await createPasswordLink(student.email) : null;
  const text = firstPayment
    ? `Halo ${student.full_name}, pembayaran ${batch.programs.name} (${batch.name}) sudah kami terima. Selamat bergabung di Weltgakkou!\n\nKelas mulai ${formatDate(batch.start_date)}, jadwal ${batch.schedule_label}.\n\nBuat password untuk masuk ke area belajar (link berlaku 1 jam):\n${link}\n\nSetelah itu, masuk lewat ${siteUrl()}/masuk untuk melihat jadwal, link kelas, dan materi.`
    : `Halo ${student.full_name}, pembayaran cicilan ke-${invoice.installment_no} ${batch.programs.name} sebesar ${formatRupiah(invoice.amount)} sudah kami terima. Terima kasih!`;

  const emailed = await sendEmail(
    student.email,
    firstPayment ? "Selamat bergabung di Weltgakkou" : "Pembayaran Weltgakkou diterima",
    text,
  );

  // Tanpa Resend, admin mengirim pesan yang sama lewat WhatsApp.
  return emailed ? { done: "accepted" } : { done: "accepted", whatsappText: text, whatsapp: student.whatsapp ?? undefined };
}

async function recordReferral(code: string | null, studentId: string, enrollmentId: string, paidAmount: number) {
  if (!code) return;
  const db = requireDb();
  const { data: referrer } = await db.from("profiles").select("id").eq("referral_code", code).maybeSingle();
  if (!referrer || referrer.id === studentId) return;
  await db.from("referrals").insert({
    referrer_id: referrer.id,
    enrollment_id: enrollmentId,
    percent: REFERRAL_PERCENT,
    amount: Math.round((paidAmount * REFERRAL_PERCENT) / 100),
  });
}

export async function rejectPayment(invoiceId: string, reason: string): Promise<VerifyState> {
  await requireAdmin();
  const db = requireDb();
  const { data } = await db
    .from("invoices")
    .update({ status: "ditolak", reject_reason: reason.trim().slice(0, 200) || null })
    .eq("id", invoiceId)
    .eq("status", "menunggu_verifikasi")
    .select("code, enrollments(profiles(whatsapp, full_name))")
    .maybeSingle();
  if (!data) return { error: "Tagihan ini sudah diproses." };
  const student = (data.enrollments as unknown as { profiles: { whatsapp: string | null; full_name: string } }).profiles;
  return {
    done: "rejected",
    whatsapp: student.whatsapp ?? undefined,
    whatsappText: `Halo ${student.full_name}, bukti pembayaran untuk tagihan ${data.code} belum bisa kami terima${reason ? `: ${reason}` : ""}. Silakan unggah ulang di ${siteUrl()}/bayar/${data.code}`,
  };
}

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
});

export type BatchState = { error?: string; ok?: string };

// Membuat batch beserta seluruh sesinya: hari kelas (default Senin-Kamis) dan
// ujian mingguan (default Jumat), jam WIB, selama jumlah minggu yang dipilih.
export async function createBatch(_prev: BatchState, formData: FormData): Promise<BatchState> {
  await requireAdmin();
  const parsed = batchSchema.safeParse({
    ...Object.fromEntries(formData),
    class_days: formData.getAll("class_days"),
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
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

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

export async function setBatchMeetingUrl(batchId: string, formData: FormData) {
  await requireAdmin();
  const url = String(formData.get("meeting_url") ?? "").trim();
  if (url && !/^https:\/\//.test(url)) return;
  await requireDb().from("batches").update({ meeting_url: url || null }).eq("id", batchId);
  refresh();
}

export async function createNextInstallment(enrollmentId: string): Promise<{ code?: string; error?: string }> {
  await requireAdmin();
  const db = requireDb();
  const { data } = await db
    .from("enrollments")
    .select("id, plan, status, invoices(installment_no, status), batches(programs(monthly_price, months))")
    .eq("id", enrollmentId)
    .maybeSingle();
  if (!data || data.plan !== "bulanan" || data.status !== "aktif") return { error: "Hanya untuk siswa aktif dengan cicilan bulanan." };
  const program = (data.batches as unknown as { programs: { monthly_price: number; months: number } }).programs;
  const invoices = data.invoices as { installment_no: number; status: string }[];
  if (invoices.some((i) => i.status === "belum" || i.status === "menunggu_verifikasi")) return { error: "Masih ada tagihan yang belum lunas." };
  const next = Math.max(...invoices.map((i) => i.installment_no)) + 1;
  if (next > program.months) return { error: "Semua cicilan sudah dibuat." };
  const code = await createInvoice(db, { enrollmentId, baseAmount: program.monthly_price, installmentNo: next, dueInHours: 24 * 7 });
  refresh();
  return { code };
}

export async function setLeadStatus(leadId: string, status: "baru" | "dihubungi" | "daftar" | "batal") {
  await requireAdmin();
  await requireDb().from("leads").update({ status }).eq("id", leadId);
  refresh();
}

// ---------- Dashboard v2 ----------

export type FormState = { error?: string; ok?: string; whatsappText?: string; whatsapp?: string };

const batchUpdateSchema = z.object({
  name: z.string().trim().min(2).max(80),
  schedule_label: z.string().trim().min(2).max(120),
  quota: z.coerce.number().int().min(1).max(50),
  meeting_url: z.union([z.literal(""), z.url()]),
  teacher_id: z.union([z.literal(""), z.uuid()]),
});

export async function updateBatch(batchId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = batchUpdateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Periksa lagi isian: " + parsed.error.issues.map((i) => i.path.join(".")).join(", ") };
  const b = parsed.data;
  const { error } = await requireDb()
    .from("batches")
    .update({ name: b.name, schedule_label: b.schedule_label, quota: b.quota, meeting_url: b.meeting_url || null, teacher_id: b.teacher_id || null })
    .eq("id", batchId);
  if (error) return { error: error.message };
  refresh();
  return { ok: "Batch disimpan." };
}

export async function updateSession(sessionId: string, formData: FormData) {
  await requireAdmin();
  const topic = String(formData.get("topic") ?? "").trim().slice(0, 120);
  const meetingUrl = String(formData.get("meeting_url") ?? "").trim();
  if (meetingUrl && !/^https:\/\//.test(meetingUrl)) return;
  await requireDb().from("sessions").update({ topic: topic || null, meeting_url: meetingUrl || null }).eq("id", sessionId);
  refresh();
}

// Absensi: baris di tabel attendance berarti hadir (sama seperti tombol "Masuk kelas" siswa).
export async function saveAttendance(sessionId: string, studentIds: string[], formData: FormData) {
  await requireAdmin();
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
  await requireAdmin();
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

export async function addMaterial(programId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = materialSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Isi judul dan link yang valid (diawali https://)." };
  const m = parsed.data;
  const { error } = await requireDb()
    .from("materials")
    .insert({ title: m.title, kind: m.kind, url: m.url, session_id: m.session_id || null, program_id: m.session_id ? null : programId });
  if (error) return { error: error.message };
  refresh();
  return { ok: "Materi ditambahkan." };
}

export async function deleteMaterial(materialId: string) {
  await requireAdmin();
  await requireDb().from("materials").delete().eq("id", materialId);
  refresh();
}

export async function setEnrollmentStatus(enrollmentId: string, status: "aktif" | "selesai" | "keluar") {
  await requireAdmin();
  await requireDb().from("enrollments").update({ status }).eq("id", enrollmentId);
  refresh();
}

// Tagihan yang dibayar tanpa unggah bukti (misalnya transfer dicek langsung di mutasi).
export async function markInvoicePaid(invoiceId: string): Promise<VerifyState> {
  await requireAdmin();
  const db = requireDb();
  const { data } = await db.from("invoices").select("status").eq("id", invoiceId).maybeSingle();
  if (!data || !["belum", "ditolak", "menunggu_verifikasi"].includes(data.status)) return { error: "Tagihan ini tidak bisa ditandai lunas." };
  if (data.status !== "menunggu_verifikasi") await db.from("invoices").update({ status: "menunggu_verifikasi" }).eq("id", invoiceId);
  // Tanpa refresh(), sama seperti acceptPayment: pesan WhatsApp harus tetap tampil.
  return acceptPayment(invoiceId);
}

export async function cancelInvoice(invoiceId: string) {
  await requireAdmin();
  await requireDb().from("invoices").update({ status: "kedaluwarsa" }).eq("id", invoiceId).in("status", ["belum", "ditolak"]);
  refresh();
}

export async function setReferralPaid(referralId: string, paid: boolean) {
  await requireAdmin();
  await requireDb().from("referrals").update({ paid }).eq("id", referralId);
  refresh();
}

export async function setLeadNote(leadId: string, formData: FormData) {
  await requireAdmin();
  await requireDb()
    .from("leads")
    .update({ note: String(formData.get("note") ?? "").trim().slice(0, 300) || null })
    .eq("id", leadId);
  refresh();
}

const staffSchema = z.object({
  full_name: z.string().trim().min(2).max(80),
  email: z.email().transform((v) => v.toLowerCase()),
  whatsapp: z.string().trim().max(20).optional(),
  role: z.enum(["pengajar", "admin", "konten"]),
});

// Menambah anggota tim. Akun dibuat tanpa password; link atur password dikirim lewat WhatsApp/email.
export async function addStaff(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = staffSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Isi nama dan email yang valid." };
  const s = parsed.data;
  const db = requireDb();
  const whatsapp = s.whatsapp ? s.whatsapp.replace(/\D/g, "").replace(/^0/, "62") : null;

  const { data: existing } = await db.from("profiles").select("id").eq("email", s.email).maybeSingle();
  if (existing) {
    await db.from("profiles").update({ role: s.role, full_name: s.full_name, ...(whatsapp ? { whatsapp } : {}) }).eq("id", existing.id);
  } else {
    const { data: created, error } = await db.auth.admin.createUser({ email: s.email, email_confirm: true, user_metadata: { full_name: s.full_name } });
    if (error || !created.user) return { error: "Akun tidak bisa dibuat: " + (error?.message ?? "tidak diketahui") };
    const { error: profileError } = await db
      .from("profiles")
      .insert({ id: created.user.id, email: s.email, full_name: s.full_name, whatsapp, role: s.role });
    if (profileError) return { error: profileError.message };
  }

  const link = await createPasswordLink(s.email);
  const text = `Halo ${s.full_name}, akun Weltgakkou kamu sudah dibuat (${s.role}).\n\nAtur password lewat link ini (berlaku 1 jam):\n${link}\n\nSetelah itu masuk di ${siteUrl()}/masuk dengan email ${s.email}.`;
  const emailed = link ? await sendEmail(s.email, "Akun Weltgakkou", text) : false;
  refresh();
  if (emailed) return { ok: `Akun ${s.full_name} siap. Link atur password dikirim ke ${s.email}.` };
  return { ok: `Akun ${s.full_name} siap. Kirim pesan ini lewat WhatsApp:`, whatsappText: text, whatsapp: whatsapp ?? undefined };
}

export async function setRole(profileId: string, role: "siswa" | "pengajar" | "admin" | "konten") {
  const admin = await requireAdmin();
  if (profileId === admin.id) return; // admin tidak bisa menurunkan dirinya sendiri
  await requireDb().from("profiles").update({ role }).eq("id", profileId);
  refresh();
}

export async function sendPasswordLink(profileId: string): Promise<FormState> {
  await requireAdmin();
  const { data } = await requireDb().from("profiles").select("full_name, email, whatsapp").eq("id", profileId).maybeSingle();
  if (!data?.email) return { error: "Profil ini belum punya email." };
  const link = await createPasswordLink(data.email);
  if (!link) return { error: "Link tidak bisa dibuat." };
  const text = `Halo ${data.full_name}, ini link untuk mengatur password akun Weltgakkou kamu (berlaku 1 jam):\n${link}\n\nSetelah itu masuk di ${siteUrl()}/masuk.`;
  const emailed = await sendEmail(data.email, "Atur password akun Weltgakkou", text);
  return emailed ? { ok: `Link dikirim ke ${data.email}.` } : { ok: "Kirim lewat WhatsApp:", whatsappText: text, whatsapp: data.whatsapp ?? undefined };
}
