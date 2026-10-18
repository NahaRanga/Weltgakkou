import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

// Cari profil berdasarkan email, atau buat akun Supabase + profil baru (password diatur nanti).
// Dipakai pendaftaran batch berbayar dan kelas trial. verifiedId = akun yang dibuat saat kode OTP dikirim.
export async function findOrCreateProfile(
  db: SupabaseClient,
  input: { email: string; full_name: string; whatsapp: string; details?: Record<string, unknown> },
  verifiedId: string | null,
): Promise<{ profileId: string; created: boolean } | { error: string }> {
  const details = input.details ?? {};
  const { data: existing } = await db.from("profiles").select("id").eq("email", input.email).maybeSingle();
  if (existing) {
    await db.from("profiles").update({ whatsapp: input.whatsapp, ...details }).eq("id", existing.id);
    return { profileId: existing.id, created: false };
  }

  let profileId: string;
  if (verifiedId) {
    profileId = verifiedId;
    await db.auth.admin.updateUserById(verifiedId, { user_metadata: { full_name: input.full_name } });
  } else {
    const { data: created, error } = await db.auth.admin.createUser({
      email: input.email,
      email_confirm: true,
      user_metadata: { full_name: input.full_name },
    });
    if (error || !created.user) {
      console.error("Gagal membuat akun", error);
      return { error: "Email ini sudah terdaftar dengan cara lain. Hubungi admin lewat WhatsApp." };
    }
    profileId = created.user.id;
  }
  const { error: profileError } = await db.from("profiles").insert({
    id: profileId,
    email: input.email,
    full_name: input.full_name,
    whatsapp: input.whatsapp,
    ...details,
    referral_code: referralCodeFor(input.full_name, profileId),
  });
  if (profileError) throw profileError;
  return { profileId, created: true };
}

function referralCodeFor(name: string, id: string) {
  const first = name.split(/\s+/)[0].toUpperCase().replace(/[^A-Z]/g, "").slice(0, 6) || "WG";
  return `${first}${id.slice(0, 4).toUpperCase()}`;
}
