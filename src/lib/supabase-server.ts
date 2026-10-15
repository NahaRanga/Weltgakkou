import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseEnv } from "@/lib/supabase-env";

// Klien Supabase yang membawa sesi login pengguna (cookie). Dipakai untuk Auth saja;
// data dibaca lewat getSupabaseAdmin() setelah identitas pengguna dicek.
export async function getSupabaseAuth() {
  const env = supabaseEnv("SUPABASE_ANON_KEY");
  if (!env) return null;
  const cookieStore = await cookies();
  return createServerClient(env.url, env.key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet) => {
        try {
          for (const { name, value, options } of toSet) cookieStore.set(name, value, options);
        } catch {
          // Dipanggil dari Server Component: cookie diperbarui oleh proxy.
        }
      },
    },
  });
}
