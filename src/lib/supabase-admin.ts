import "server-only";
import { createClient } from "@supabase/supabase-js";

// Klien dengan service role: hanya dipakai di server (Server Actions).
// Jangan pernah mengimpor file ini dari Client Component.
export function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}
