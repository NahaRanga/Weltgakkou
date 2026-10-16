import { withBase } from "@/lib/base-path";

export const site = {
  name: "Weltgakkou",
  tagline: "Kursus bahasa Jepang online, dari Kiso sampai JLPT N3 dan JFT-Basic",
  // Nomor WhatsApp admin, format 62xxxxxxxxxx. Diisi lewat env saat deploy.
  whatsapp: process.env.NEXT_PUBLIC_WA_NUMBER ?? "",
  email: "",
};

// Akun sosial media resmi. Link yang kosong tidak ditampilkan.
export const social: { key: SocialKey; label: string; url: string }[] = [
  { key: "instagram", label: "Instagram", url: "https://www.instagram.com/weltgakko.academie/" },
  { key: "tiktok", label: "TikTok", url: "https://www.tiktok.com/@weltgakko.academie" },
  { key: "youtube", label: "YouTube", url: "" },
  { key: "facebook", label: "Facebook", url: "https://www.facebook.com/p/Welt-Gakkou-61573648632408/" },
];
export type SocialKey = "instagram" | "tiktok" | "youtube" | "facebook" | "whatsapp";

export const activeSocial = () => social.filter((s) => s.url);

export function waLink(text: string) {
  if (!site.whatsapp) return withBase("/waiting-list");
  return `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(text)}`;
}
