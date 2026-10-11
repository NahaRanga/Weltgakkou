import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Klien Supabase yang membawa sesi login pengguna (cookie). Dipakai untuk Auth saja;
// data dibaca lewat getSupabaseAdmin() setelah identitas pengguna dicek.
export async function getSupabaseAuth() {
  const url = process.env.SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY;
  if (!url || !anon) return null;
  const cookieStore = await cookies();
  return createServerClient(url, anon, {
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
