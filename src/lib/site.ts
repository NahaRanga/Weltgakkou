import { withBase } from "@/lib/base-path";

export const site = {
  name: "Weltgakkou",
  tagline: "Kursus bahasa Jepang online, dari Kiso sampai JLPT N3 dan JFT-Basic",
  // Nomor WhatsApp admin, format 62xxxxxxxxxx. Diisi lewat env saat deploy.
  whatsapp: process.env.NEXT_PUBLIC_WA_NUMBER ?? "",
};

export function waLink(text: string) {
  if (!site.whatsapp) return withBase("/waiting-list");
  return `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(text)}`;
}
