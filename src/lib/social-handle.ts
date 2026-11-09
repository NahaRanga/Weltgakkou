// Username Instagram/TikTok dari isian bebas: "@nama", "nama", atau link profil
// (instagram.com/nama, https://www.tiktok.com/@nama?lang=id). Hasil disimpan tanpa "@".

export type SocialPlatform = "instagram" | "tiktok";

const HOSTS: Record<SocialPlatform, RegExp> = {
  instagram: /^(www\.|m\.)?(instagram\.com|instagr\.am)$/i,
  tiktok: /^(www\.|m\.)?tiktok\.com$/i,
};

// Aturan username: IG maks 30 karakter, TikTok 2–24; huruf, angka, titik, garis bawah.
const PATTERN: Record<SocialPlatform, RegExp> = {
  instagram: /^[a-z0-9._]{1,30}$/,
  tiktok: /^[a-z0-9._]{2,24}$/,
};

export const SOCIAL_LABEL: Record<SocialPlatform, string> = { instagram: "Instagram", tiktok: "TikTok" };

/** Kosong → null. Tidak valid → { error }. Valid → { value } (huruf kecil, tanpa @). */
export function normalizeHandle(platform: SocialPlatform, raw: string): { value: string | null } | { error: string } {
  let s = raw.trim();
  if (!s) return { value: null };
  const label = SOCIAL_LABEL[platform];

  if (/^(https?:\/\/)?[\w.-]+\.[a-z]{2,}\//i.test(s) || /^https?:\/\//i.test(s)) {
    let url: URL;
    try {
      url = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
    } catch {
      return { error: `Link ${label} tidak valid. Tulis username saja, contoh @namakamu` };
    }
    if (platform === "tiktok" && /^(vm|vt)\.tiktok\.com$/i.test(url.hostname))
      return { error: "Link pendek TikTok tidak bisa dibaca. Tulis username saja, contoh @namakamu" };
    if (!HOSTS[platform].test(url.hostname))
      return { error: `Ini bukan link profil ${label}. Tulis username saja, contoh @namakamu` };
    s = url.pathname.split("/").filter(Boolean)[0] ?? "";
  }

  s = s.replace(/^@+/, "").toLowerCase();
  if (!PATTERN[platform].test(s)) return { error: `Username ${label} tidak valid. Contoh: @namakamu` };
  return { value: s };
}

export function profileUrl(platform: SocialPlatform, handle: string) {
  return platform === "instagram" ? `https://www.instagram.com/${handle}/` : `https://www.tiktok.com/@${handle}`;
}

// Pilihan "Tau Weltgakko dari mana?" (keputusan winata 2026-11-04: cukup 4 ini).
export const HEARD_FROM = [
  { value: "tiktok", label: "TikTok" },
  { value: "instagram", label: "Instagram" },
  { value: "website", label: "Website" },
  { value: "teman", label: "Teman" },
] as const;

export type HeardFrom = (typeof HEARD_FROM)[number]["value"];

export function heardFromLabel(value: string | null | undefined) {
  return HEARD_FROM.find((o) => o.value === value)?.label ?? null;
}
