import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseEnv } from "@/lib/supabase-env";

// Memperbarui token sesi Supabase sebelum halaman yang butuh login dirender.
// Pengunjung tanpa sesi di /admin dan /belajar langsung dialihkan ke /masuk.
// Cek role (admin/pengajar/siswa) tetap di layout dan route handler masing-masing.
// /latihan ikut diperbarui sesinya tapi terbuka untuk tamu (halaman tes mengecek login sendiri).
const PROTECTED = /^\/(admin|belajar)(\/|$)/;

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const env = supabaseEnv("SUPABASE_ANON_KEY");
  if (!env) return response;

  const supabase = createServerClient(env.url, env.key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet) => {
        for (const { name, value } of toSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of toSet) response.cookies.set(name, value, options);
      },
    },
  });
  let signedIn = true;
  try {
    const { data } = await supabase.auth.getUser();
    signedIn = Boolean(data.user);
  } catch (error) {
    // Supabase tidak terjangkau atau kunci salah: biarkan halaman yang menangani.
    console.error("Gagal memperbarui sesi Supabase", error);
  }

  const { pathname, search } = request.nextUrl;
  if (!signedIn && PROTECTED.test(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/masuk";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    const redirect = NextResponse.redirect(url);
    // Bawa cookie sesi yang dihapus/diperbarui Supabase.
    for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
    return redirect;
  }
  return response;
}

export const config = {
  matcher: ["/belajar/:path*", "/admin/:path*", "/masuk/:path*", "/atur-password", "/latihan/:path*"],
};
