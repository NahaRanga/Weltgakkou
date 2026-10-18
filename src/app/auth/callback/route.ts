import { NextResponse, type NextRequest } from "next/server";
import { findOrCreateProfile } from "@/lib/accounts";
import { withBase } from "@/lib/base-path";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getSupabaseAuth } from "@/lib/supabase-server";

// Kembali dari Google: tukar kode menjadi sesi login, buat profil bila akun baru, lalu ke tujuan.
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const rawNext = request.nextUrl.searchParams.get("next") ?? "";
  const next = /^\/(?![/\\])/.test(rawNext) ? rawNext : "/belajar";
  const auth = await getSupabaseAuth();
  const db = getSupabaseAdmin();

  if (auth && db && code) {
    const { data, error } = await auth.auth.exchangeCodeForSession(code);
    if (!error && data.user?.email) {
      const email = data.user.email.toLowerCase();
      const meta = data.user.user_metadata ?? {};
      const { data: profile } = await db.from("profiles").select("id").eq("email", email).maybeSingle();
      if (!profile) {
        // Nomor WhatsApp belum ada dari Google; siswa mengisinya saat daftar batch atau trial.
        await findOrCreateProfile(db, { email, full_name: String(meta.full_name ?? meta.name ?? email.split("@")[0]), whatsapp: "" }, data.user.id).catch(
          (e) => console.error("Gagal membuat profil akun Google", e),
        );
      }
      return NextResponse.redirect(new URL(withBase(next), request.url));
    }
    console.error("Login Google gagal", error?.code, error?.message);
  }
  return NextResponse.redirect(new URL(withBase("/masuk?google=gagal"), request.url));
}
