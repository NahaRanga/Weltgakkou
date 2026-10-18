"use server";

import { refresh } from "next/cache";
import type { FormState } from "@/app/admin/types";
import { requireDb, requireStaff } from "@/lib/auth";
import { getSupabaseAuth } from "@/lib/supabase-server";

export async function updateProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireStaff();
  const fullName = String(formData.get("full_name") ?? "").trim();
  const whatsapp = String(formData.get("whatsapp") ?? "").replace(/\D/g, "").replace(/^0/, "62");
  if (fullName.length < 2) return { error: "Nama minimal 2 huruf." };
  const { error } = await requireDb().from("profiles").update({ full_name: fullName, whatsapp: whatsapp || null }).eq("id", user.id);
  if (error) return { error: error.message };
  refresh();
  return { ok: "Profil disimpan." };
}

export async function changePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireStaff();
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) return { error: "Password minimal 8 karakter." };
  if (password !== String(formData.get("confirm") ?? "")) return { error: "Kedua password tidak sama." };
  const auth = await getSupabaseAuth();
  if (!auth) return { error: "Login belum aktif." };
  const { error } = await auth.auth.updateUser({ password });
  if (error) return { error: error.code === "same_password" ? "Password baru sama dengan yang lama." : "Password gagal diganti. Coba keluar lalu masuk lagi." };
  return { ok: "Password diganti. Pakai password baru saat login berikutnya." };
}
