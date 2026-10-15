import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabaseEnv } from "@/lib/supabase-env";

// Klien dengan service role: hanya dipakai di server (Server Actions).
// Jangan pernah mengimpor file ini dari Client Component.
export function getSupabaseAdmin() {
  const env = supabaseEnv("SUPABASE_SERVICE_ROLE_KEY");
  if (!env) return null;
  return createClient(env.url, env.key, { auth: { persistSession: false } });
}
