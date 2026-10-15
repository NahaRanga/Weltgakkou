import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseEnv } from "@/lib/supabase-env";

// Memperbarui token sesi Supabase sebelum halaman yang butuh login dirender.
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
  try {
    await supabase.auth.getUser();
  } catch (error) {
    // Supabase tidak terjangkau atau kunci salah: tetap tampilkan halaman tanpa sesi.
    console.error("Gagal memperbarui sesi Supabase", error);
  }
  return response;
}

export const config = {
  matcher: ["/belajar/:path*", "/admin/:path*", "/masuk/:path*", "/atur-password"],
};
