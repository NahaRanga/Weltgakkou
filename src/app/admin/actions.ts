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
