"use server";

import { z } from "zod";
import { findOrCreateProfile } from "@/lib/accounts";
import { googleLoginEnabled } from "@/lib/google-login";
import { siteUrl } from "@/lib/format";
import { programs } from "@/lib/programs";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getSupabaseAuth } from "@/lib/supabase-server";

// Daftar akun Weltgakko (tanpa langsung daftar batch): nama, WhatsApp, email, password,
// program yang diminati. Langkah 1 kirim kode 6 digit ke email, langkah 2 cek kode,
// pasang password, lalu sesi login langsung aktif.
export type SignUpState = { error?: string; step?: "code"; redirectTo?: string };

const schema = z.object({
  full_name: z.string().trim().min(2, "Nama minimal 2 huruf").max(100),
  whatsapp: z
    .string()
    .trim()
    .transform((v) => v.replace(/[\s-]/g, ""))
    .pipe(z.string().regex(/^(\+62|62|0)8\d{7,12}$/, "Nomor WhatsApp tidak valid, contoh 081234567890"))
    .transform((v) => (v.startsWith("+62") ? "62" + v.slice(3) : v.startsWith("0") ? "62" + v.slice(1) : v)),
  email: z.email("Email tidak valid").transform((v) => v.toLowerCase()),
  password: z.string().min(8, "Password minimal 8 karakter").max(72),
  program: z.enum(["", ...programs.map((p) => p.slug)]).catch(""),
});

export async function signUpAccount(_prev: SignUpState, formData: FormData): Promise<SignUpState> {
  const parsed = schema.safeParse(
    Object.fromEntries(["full_name", "whatsapp", "email", "password", "program"].map((k) => [k, String(formData.get(k) ?? "")])),
  );
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Periksa lagi isian kamu." };
  const input = parsed.data;
  const auth = await getSupabaseAuth();
  const db = getSupabaseAdmin();
  if (!auth || !db) return { error: "Pendaftaran akun sedang gangguan. Hubungi kami lewat WhatsApp." };

  const code = String(formData.get("code") ?? "").replace(/\D/g, "");
  if (!code) {
    const { error } = await auth.auth.signInWithOtp({ email: input.email, options: { shouldCreateUser: true } });
    if (error?.status === 429) return { step: "code", error: "Kode baru saja dikirim. Tunggu sebentar sebelum minta kode lagi." };
    if (error) {
      console.error("Gagal kirim kode daftar akun", error.status, error.code, error.message);
      return { error: "Kode gagal dikirim. Periksa lagi alamat email kamu." };
    }
    return { step: "code" };
  }

  if (code.length !== 6) return { step: "code", error: "Kode terdiri dari 6 angka." };
  const { data, error } = await auth.auth.verifyOtp({ email: input.email, token: code, type: "email" });
  if (error || !data.user) return { step: "code", error: "Kode salah atau sudah kedaluwarsa. Minta kode baru bila perlu." };

  // Email sudah terbukti milik pendaftar, jadi password boleh dipasang (juga untuk akun lama tanpa password).
  const { error: passwordError } = await auth.auth.updateUser({ password: input.password, data: { full_name: input.full_name } });
  if (passwordError) console.error("Gagal memasang password akun baru", passwordError.code, passwordError.message);

  const account = await findOrCreateProfile(db, input, data.user.id).catch((e) => {
    console.error("Gagal membuat profil akun", e);
    return { error: "Akun gagal dibuat. Coba lagi atau hubungi admin lewat WhatsApp." };
  });
  if ("error" in account) return { error: account.error };

  // Program yang diminati masuk waiting list supaya tim bisa menghubungi saat batch dibuka.
  if (input.program) {
    await db
      .from("leads")
      .insert({ full_name: input.full_name, whatsapp: input.whatsapp, email: input.email, program_slug: input.program, source: "akun" })
      .then(({ error }) => error && console.error("Gagal mencatat minat program", error.message));
  }
  return { redirectTo: "/belajar" };
}

// Masuk/daftar dengan Google. Aktif hanya bila NEXT_PUBLIC_GOOGLE_LOGIN=on dan provider Google
// sudah dinyalakan di Supabase. Hasilnya alamat Google tujuan, dibuka browser dengan muat ulang penuh.
export async function googleSignIn(next: string): Promise<{ url?: string; error?: string }> {
  if (!googleLoginEnabled()) return { error: "Masuk dengan Google belum aktif." };
  const auth = await getSupabaseAuth();
  if (!auth) return { error: "Login belum aktif. Hubungi admin." };
  const safe = /^\/(?![/\\])/.test(next) ? next : "/belajar";
  const { data, error } = await auth.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${siteUrl()}/auth/callback?next=${encodeURIComponent(safe)}`, skipBrowserRedirect: true },
  });
  if (error || !data.url) {
    console.error("Gagal memulai login Google", error?.code, error?.message);
    return { error: "Masuk dengan Google sedang gangguan. Pakai email dulu, ya." };
  }
  return { url: data.url };
}
