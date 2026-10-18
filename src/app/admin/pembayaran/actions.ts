"use server";

import { refresh } from "next/cache";
import { createPasswordLink } from "@/app/(site)/masuk/actions";
import type { VerifyState } from "@/app/admin/types";
import { requireAdmin, requireDb } from "@/lib/auth";
import { createInvoice } from "@/lib/billing";
import { sendEmail } from "@/lib/email";
import { formatDate, siteUrl } from "@/lib/format";
import { formatRupiah } from "@/lib/programs";

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
    batches: {
      name: string;
      mode: string;
      start_date: string;
      schedule_label: string;
      programs: { name: string; recording_months: number | null };
    };
  };
};

export async function acceptPayment(invoiceId: string): Promise<VerifyState> {
  const admin = await requireAdmin();
  const db = requireDb();

  const { data } = await db
    .from("invoices")
    .select(
      "id, code, amount, unique_code, status, installment_no, enrollments(id, status, referral_code, profile_id, profiles(full_name, email, whatsapp), batches(name, mode, start_date, schedule_label, programs(name, recording_months)))",
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

  const recordingMonths = batch.mode === "rekaman" ? (batch.programs.recording_months ?? 6) : null;
  const accessUntil = recordingMonths ? new Date(Date.now() + recordingMonths * 30 * 86_400_000).toISOString() : null;

  if (firstPayment) {
    await db.from("enrollments").update({ status: "aktif", access_until: accessUntil }).eq("id", enrollment.id);
    await recordReferral(enrollment.referral_code, enrollment.profile_id, enrollment.id, invoice.amount - invoice.unique_code);
  }
  // Tanpa refresh(): kartu verifikasi harus tetap tampil supaya admin bisa
  // menyalin pesan WhatsApp berisi link login.

  // Siswa baru menerima link untuk membuat password; siswa lama cukup diberi tahu.
  const link = firstPayment ? await createPasswordLink(student.email) : null;
  const text = firstPayment && accessUntil
    ? `Halo ${student.full_name}, pembayaran paket rekaman ${batch.programs.name} sudah kami terima. Selamat belajar di Weltgakko!\n\nVideo bisa ditonton kapan saja sampai ${formatDate(accessUntil)}.\n\nBuat password untuk masuk ke area belajar (link berlaku 1 jam):\n${link}\n\nSetelah itu, masuk lewat ${siteUrl()}/masuk untuk membuka video dan materi.`
    : firstPayment
    ? `Halo ${student.full_name}, pembayaran ${batch.programs.name} (${batch.name}) sudah kami terima. Selamat bergabung di Weltgakko!\n\nKelas mulai ${formatDate(batch.start_date)}, jadwal ${batch.schedule_label}.\n\nBuat password untuk masuk ke area belajar (link berlaku 1 jam):\n${link}\n\nSetelah itu, masuk lewat ${siteUrl()}/masuk untuk melihat jadwal, link kelas, dan materi.`
    : `Halo ${student.full_name}, pembayaran cicilan ke-${invoice.installment_no} ${batch.programs.name} sebesar ${formatRupiah(invoice.amount)} sudah kami terima. Terima kasih!`;

  const emailed = await sendEmail(
    student.email,
    firstPayment ? "Selamat bergabung di Weltgakko" : "Pembayaran Weltgakko diterima",
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
