"use server";

import { sendPasswordEmail, verificationEnabled } from "@/lib/email-verification";
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
  // Hanya path di situs ini. "//x" dan "/\\x" dibaca browser sebagai domain lain.
  return /^\/(?![/\\])/.test(next) ? next : "/belajar";
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
  return { redirectTo: await destination(formData.get("next"), data.user.id) };
}

// Masuk tanpa password: kode 6 digit dikirim ke email akun yang sudah ada. Dipakai siswa
// yang baru daftar (password baru dibuat setelah lunas) atau link atur password-nya kedaluwarsa.
export type CodeState = AuthState & { step?: "code"; email?: string };

export async function signInWithCode(_prev: CodeState, formData: FormData): Promise<CodeState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Email tidak valid." };
  const auth = await getSupabaseAuth();
  if (!auth) return { error: "Login belum aktif. Hubungi admin." };
  const code = String(formData.get("code") ?? "").replace(/\D/g, "");

  if (!code) {
    // Hanya akun yang sudah terdaftar; email lain tidak dibuatkan akun lewat halaman ini.
    const { error } = await auth.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
    if (error?.status === 429) return { step: "code", email, error: "Kode baru saja dikirim. Tunggu sebentar sebelum minta kode lagi." };
    if (error && error.code !== "otp_disabled" && error.code !== "user_not_found") {
      console.error("Gagal kirim kode login", error.status, error.code, error.message);
      return { error: `Kode gagal dikirim (${error.code ?? error.status ?? "tidak diketahui"}). Hubungi admin.` };
    }
    // Email yang belum terdaftar tetap dibawa ke langkah kode supaya daftar akun tidak bisa ditebak.
    return { step: "code", email };
  }

  if (code.length !== 6) return { step: "code", email, error: "Kode terdiri dari 6 angka." };
  const { data, error } = await auth.auth.verifyOtp({ email, token: code, type: "email" });
  if (error || !data.user) return { step: "code", email, error: "Kode salah atau sudah kedaluwarsa. Minta kode baru bila perlu." };
  return { redirectTo: await destination(formData.get("next"), data.user.id) };
}

// Staf (admin, admin utama, finance, pengajar) yang login tanpa tujuan khusus langsung dibawa ke dashboard.
async function destination(rawNext: FormDataEntryValue | null, userId: string) {
  const next = safeNext(rawNext);
  if (next !== "/belajar") return next;
  const { data: profile } = (await getSupabaseAdmin()?.from("profiles").select("role").eq("id", userId).maybeSingle()) ?? { data: null };
  return ["admin", "admin_utama", "finance", "pengajar"].includes(profile?.role ?? "") ? "/admin" : next;
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

  // Pakai email Supabase (SMTP admin@weltgakko.com) bila aktif, selain itu lewat Resend.
  if (verificationEnabled()) {
    await sendPasswordEmail(email);
    return ok;
  }
  const link = await createPasswordLink(email);
  if (link) {
    await sendEmail(
      email,
      "Atur password akun Weltgakko",
      `Klik link berikut untuk mengatur password akun Weltgakko kamu:\n\n${link}\n\nLink berlaku 1 jam. Abaikan email ini bila kamu tidak memintanya.`,
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
