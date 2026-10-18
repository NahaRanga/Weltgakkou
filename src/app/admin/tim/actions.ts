"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { createPasswordLink } from "@/app/(site)/masuk/actions";
import type { FormState } from "@/app/admin/types";
import { requireAdmin, requireDb } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { siteUrl } from "@/lib/format";

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
