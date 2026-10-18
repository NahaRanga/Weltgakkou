"use server";

import { refresh } from "next/cache";
import { createPasswordLink } from "@/app/(site)/masuk/actions";
import type { FormState } from "@/app/admin/types";
import { requireAdmin, requireDb } from "@/lib/auth";
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
  const text = `Halo ${data.full_name}, ini link untuk mengatur password akun Weltgakkou kamu (berlaku 1 jam):\n${link}\n\nSetelah itu masuk di ${siteUrl()}/masuk.`;
  const emailed = await sendEmail(data.email, "Atur password akun Weltgakkou", text);
  return emailed ? { ok: `Link dikirim ke ${data.email}.` } : { ok: "Kirim lewat WhatsApp:", whatsappText: text, whatsapp: data.whatsapp ?? undefined };
}
