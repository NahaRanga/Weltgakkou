"use server";

import { refresh } from "next/cache";
import { createPasswordLink } from "@/app/(site)/masuk/actions";
import type { FormState } from "@/app/admin/types";
import { requireAdmin, requireDb } from "@/lib/auth";
import { issueCertificates } from "@/lib/certificates";
import { sendEmail } from "@/lib/email";
import { siteUrl } from "@/lib/format";

export async function setEnrollmentStatus(enrollmentId: string, status: "aktif" | "selesai" | "keluar") {
  await requireAdmin();
  const db = requireDb();
  await db.from("enrollments").update({ status }).eq("id", enrollmentId);
  // Siswa yang selesai otomatis dapat nomor sertifikat (sekali; nomor lama dipakai lagi bila diaktifkan ulang).
  if (status === "selesai") await issueCertificates(db, [enrollmentId]);
  refresh();
}

// Terbitkan sertifikat manual (mis. siswa yang sudah "selesai" sebelum fitur sertifikat ada).
export async function issueCertificate(enrollmentId: string) {
  await requireAdmin();
  await issueCertificates(requireDb(), [enrollmentId]);
  refresh();
}

// Cabut sertifikat: nomor dihapus, halaman cek keaslian tidak lagi mengenalinya.
export async function revokeCertificate(enrollmentId: string) {
  await requireAdmin();
  await requireDb().from("enrollments").update({ certificate_no: null, certificate_issued_at: null }).eq("id", enrollmentId);
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
