import "server-only";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { supabaseEnv } from "@/lib/supabase-env";

// Verifikasi email pendaftar dengan kode OTP 6 digit yang dikirim Supabase Auth
// (lewat SMTP admin@weltgakko.com). Setelah kode benar, server menyimpan cookie
// bertanda tangan berisi email dan id akun, lalu pendaftaran hanya menerima email itu.
// Dimatikan bila EMAIL_VERIFICATION bukan "on", misalnya sebelum SMTP dipasang.
export const verificationEnabled = () => process.env.EMAIL_VERIFICATION === "on";

const COOKIE = "wg_email_verified";
const VALID_MS = 2 * 3600_000;

// Klien anon tanpa sesi: hasil verifyOtp tidak ikut menjadi sesi login di browser.
function authClient() {
  const env = supabaseEnv("SUPABASE_ANON_KEY");
  if (!env) return null;
  return createClient(env.url, env.key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function sign(payload: string) {
  const secret = supabaseEnv("SUPABASE_SERVICE_ROLE_KEY")?.key;
  if (!secret) throw new Error("SUPABASE_SERVICE_ROLE_KEY belum diisi");
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return btoa(String.fromCharCode(...new Uint8Array(mac))).replace(/[+/=]/g, (c) => ({ "+": "-", "/": "_", "=": "" })[c]!);
}

export async function sendCode(email: string): Promise<{ ok?: true; error?: string }> {
  const auth = authClient();
  if (!auth) return { error: "Verifikasi email sedang gangguan. Hubungi kami lewat WhatsApp." };
  const { error } = await auth.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
  if (!error) return { ok: true };
  console.error("Gagal kirim kode verifikasi", error.status, error.message);
  if (error.status === 429) return { error: "Kode baru saja dikirim. Tunggu sebentar sebelum minta kode lagi." };
  return { error: "Kode gagal dikirim. Periksa lagi alamat email kamu." };
}

export async function checkCode(email: string, code: string): Promise<{ ok?: true; error?: string }> {
  const auth = authClient();
  if (!auth) return { error: "Verifikasi email sedang gangguan. Hubungi kami lewat WhatsApp." };
  const { data, error } = await auth.auth.verifyOtp({ email, token: code, type: "email" });
  if (error || !data.user) return { error: "Kode salah atau sudah kedaluwarsa. Minta kode baru bila perlu." };

  const payload = `${email}|${data.user.id}|${Date.now() + VALID_MS}`;
  (await cookies()).set(COOKIE, `${payload}|${await sign(payload)}`, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: VALID_MS / 1000,
    path: "/",
  });
  return { ok: true };
}

// Link atur password lewat email Supabase (template "Reset password" mengarah ke /auth/confirm).
export async function sendPasswordEmail(email: string) {
  const auth = authClient();
  if (!auth) return false;
  const { error } = await auth.auth.resetPasswordForEmail(email);
  if (error) console.error("Gagal kirim email atur password", error.status, error.message);
  return !error;
}

// Id akun dari email yang sudah diverifikasi di browser ini, atau null.
export async function verifiedUserId(email: string): Promise<string | null> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  const parts = raw.split("|");
  if (parts.length !== 4) return null;
  const [mail, userId, expires, mac] = parts;
  if (mail !== email || Number(expires) < Date.now()) return null;
  return mac === (await sign(`${mail}|${userId}|${expires}`)) ? userId : null;
}
