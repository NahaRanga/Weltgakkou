"use server";

import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getSupabaseAuth } from "@/lib/supabase-server";
import { sendEmail } from "@/lib/email";
import { siteUrl } from "@/lib/format";

// redirectTo: halaman tujuan setelah berhasil. Pindah halaman dilakukan browser dengan
// muat ulang penuh, karena redirect() dari Server Action di Worker gagal mengambil halaman
// tujuan (Worker tidak bisa memanggil rute dirinya sendiri) dan sesi login ikut hilang.
export type AuthState = { error?: string; ok?: string; redirectTo?: string };

function safeNext(raw: FormDataEntryValue | null) {
  const next = String(raw ?? "");
  return next.startsWith("/") && !next.startsWith("//") ? next : "/belajar";
}

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const auth = await getSupabaseAuth();
  if (!auth) return { error: "Login belum aktif. Hubungi admin." };

  const { data, error } = await auth.auth.signInWithPassword({
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    password: String(formData.get("password") ?? ""),
  });
  if (error) {
    if (error.code === "invalid_credentials") return { error: "Email atau password salah." };
    // Selain password salah biasanya karena kunci/alamat Supabase keliru atau tidak terjangkau.
    console.error("Login gagal", error.status, error.code, error.message);
    return { error: `Login sedang gangguan (${error.code ?? error.status ?? "tidak diketahui"}). Hubungi admin.` };
  }
  const next = safeNext(formData.get("next"));
  // Admin dan pengajar yang login tanpa tujuan khusus langsung dibawa ke dashboard.
  if (next === "/belajar" && data.user) {
    const { data: profile } = (await getSupabaseAdmin()?.from("profiles").select("role").eq("id", data.user.id).maybeSingle()) ?? { data: null };
    if (profile?.role === "admin" || profile?.role === "pengajar") return { redirectTo: "/admin" };
  }
  return { redirectTo: next };
}

export async function signOut() {
  const auth = await getSupabaseAuth();
  await auth?.auth.signOut();
}

// Link atur password dibuat di server lalu dikirim lewat Resend, supaya tidak
// bergantung pada pengirim email bawaan Supabase yang kuotanya kecil.
export async function createPasswordLink(email: string) {
  const db = getSupabaseAdmin();
  if (!db) return null;
  const { data, error } = await db.auth.admin.generateLink({ type: "recovery", email });
  if (error || !data.properties?.hashed_token) return null;
  return `${siteUrl()}/auth/confirm?token_hash=${data.properties.hashed_token}&type=recovery`;
}

export async function requestPasswordReset(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const ok = { ok: "Kalau email ini terdaftar, link untuk mengatur password sudah kami kirim." };
  if (!email.includes("@")) return { error: "Email tidak valid." };

  const db = getSupabaseAdmin();
  const { data: profile } = db ? await db.from("profiles").select("id").eq("email", email).maybeSingle() : { data: null };
  if (!profile) return ok;

  const link = await createPasswordLink(email);
  if (link) {
    await sendEmail(
      email,
      "Atur password akun Weltgakkou",
      `Klik link berikut untuk mengatur password akun Weltgakkou kamu:\n\n${link}\n\nLink berlaku 1 jam. Abaikan email ini bila kamu tidak memintanya.`,
    );
  }
  return ok;
}

export async function setPassword(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) return { error: "Password minimal 8 karakter." };
  if (password !== String(formData.get("confirm") ?? "")) return { error: "Kedua password tidak sama." };

  const auth = await getSupabaseAuth();
  if (!auth) return { error: "Login belum aktif. Hubungi admin." };
  const { error } = await auth.auth.updateUser({ password });
  if (error) return { error: "Link sudah kedaluwarsa. Minta link baru lewat halaman lupa password." };
  return { redirectTo: "/belajar" };
}
