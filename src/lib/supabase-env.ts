// Membaca alamat dan kunci Supabase dari env dengan toleran terhadap salah tempel
// (spasi, tanda kutip, tanpa https://, garis miring di akhir). Nilai yang tetap tidak
// valid dicatat ke log dan dianggap kosong, supaya halaman tidak ikut error.
export function supabaseEnv(keyName: "SUPABASE_ANON_KEY" | "SUPABASE_SERVICE_ROLE_KEY") {
  const clean = (v: string | undefined) => (v ?? "").trim().replace(/^["']|["']$/g, "").trim();
  const rawUrl = clean(process.env.SUPABASE_URL);
  const key = clean(process.env[keyName]);
  if (!rawUrl || !key) return null;

  const url = (/^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`).replace(/\/+$/, "");
  try {
    new URL(url);
  } catch {
    console.error("SUPABASE_URL tidak valid. Isi dengan Project URL, contoh https://xxxx.supabase.co");
    return null;
  }
  return { url, key };
}
