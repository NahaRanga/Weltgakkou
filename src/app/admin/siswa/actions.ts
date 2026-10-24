"use server";

import { refresh } from "next/cache";
import { createPasswordLink } from "@/app/(site)/masuk/actions";
import type { FormState } from "@/app/admin/types";
import { canDeleteStudents, requireAdmin, requireDb, requireFinance } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { siteUrl } from "@/lib/format";

export async function setEnrollmentStatus(enrollmentId: string, status: "aktif" | "selesai" | "keluar") {
  await requireAdmin();
  await requireDb().from("enrollments").update({ status }).eq("id", enrollmentId);
  refresh();
}

export async function sendPasswordLink(profileId: string): Promise<FormState> {
  await requireAdmin();
  const { data } = await requireDb().from("profiles").select("full_name, email, whatsapp").eq("id", profileId).maybeSingle();
  if (!data?.email) return { error: "Profil ini belum punya email." };
  const link = await createPasswordLink(data.email);
  if (!link) return { error: "Link tidak bisa dibuat." };
  const text = `Halo ${data.full_name}, ini link untuk mengatur password akun Weltgakko kamu (berlaku 1 jam):\n${link}\n\nSetelah itu masuk di ${siteUrl()}/masuk.`;
  const emailed = await sendEmail(data.email, "Atur password akun Weltgakko", text);
  return emailed ? { ok: `Link dikirim ke ${data.email}.` } : { ok: "Kirim lewat WhatsApp:", whatsappText: text, whatsapp: data.whatsapp ?? undefined };
}

// Hapus akun siswa beserta semua datanya (pendaftaran, tagihan, bukti transfer, absen, nilai, latihan, akun login).
// Hanya admin utama dan finance. Akun staf (admin, pengajar, dll.) tidak bisa dihapus dari sini.
// Siswa yang punya tagihan lunas wajib dikonfirmasi dengan mengetik "HAPUS".
export async function deleteStudent(profileId: string, confirmText = ""): Promise<{ error?: string }> {
  const me = await requireFinance();
  if (!canDeleteStudents(me.role)) return { error: "Hanya admin utama atau finance yang boleh menghapus siswa." };
  if (profileId === me.id) return { error: "Tidak bisa menghapus akun sendiri." };
  const db = requireDb();

  const { data: profile } = await db.from("profiles").select("id, role, email").eq("id", profileId).maybeSingle();
  if (!profile) return { error: "Siswa tidak ditemukan." };
  if (profile.role !== "siswa") return { error: "Hanya akun siswa yang bisa dihapus. Ubah dulu perannya di menu Tim bila perlu." };

  const { data: enrollmentRows } = await db.from("enrollments").select("id, invoices(status, payment_proofs(file_path))").eq("profile_id", profileId);
  const enrollments = (enrollmentRows ?? []) as unknown as { id: string; invoices: { status: string; payment_proofs: { file_path: string }[] }[] }[];
  const invoices = enrollments.flatMap((e) => e.invoices);
  if (invoices.some((i) => i.status === "lunas") && confirmText.trim().toUpperCase() !== "HAPUS") {
    return { error: "Siswa ini punya tagihan lunas. Ketik HAPUS untuk konfirmasi." };
  }

  const files = invoices.flatMap((i) => i.payment_proofs.map((p) => p.file_path));
  if (files.length) await db.storage.from("payment-proofs").remove(files);

  const enrollmentIds = enrollments.map((e) => e.id);
  const steps = [
    db.from("referrals").delete().eq("referrer_id", profileId),
    ...(enrollmentIds.length ? [db.from("referrals").delete().in("enrollment_id", enrollmentIds)] : []),
    db.from("attendance").delete().eq("profile_id", profileId),
    db.from("exam_results").delete().eq("profile_id", profileId),
    db.from("certifications").delete().eq("profile_id", profileId),
    db.from("recording_views").delete().eq("profile_id", profileId),
    db.from("payment_proofs").update({ verified_by: null }).eq("verified_by", profileId),
  ];
  for (const step of steps) {
    const { error } = await step;
    if (error) return { error: "Gagal menghapus data siswa: " + error.message };
  }
  // Tagihan dan catatan bukti transfer ikut terhapus (on delete cascade).
  const { error: enrollError } = await db.from("enrollments").delete().eq("profile_id", profileId);
  if (enrollError) return { error: "Gagal menghapus pendaftaran: " + enrollError.message };

  // Jejak pendaftaran lain dengan email yang sama (waiting list, seminar).
  if (profile.email) {
    const email = profile.email.replace(/[\\%_]/g, (c: string) => "\\" + c); // ilike tanpa wildcard
    await db.from("leads").delete().ilike("email", email);
    await db.from("seminar_registrations").delete().ilike("email", email);
  }

  // Akun login; profil dan riwayat latihan ikut terhapus (on delete cascade).
  const { error: authError } = await db.auth.admin.deleteUser(profileId);
  if (authError) {
    const { error } = await db.from("profiles").delete().eq("id", profileId);
    if (error) return { error: "Data siswa terhapus, tapi akun login gagal dihapus: " + authError.message };
  }
  refresh();
  return {};
}
