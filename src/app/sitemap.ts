import type { MetadataRoute } from "next";
import { infoPages } from "@/lib/info-pages";
import { programs } from "@/lib/programs";

// Alamat utama situs. Sitemap dibuat saat build, jadi jangan bergantung pada SITE_URL runtime.
const BASE = "https://weltgakko.com";

// Hanya halaman publik; area siswa, admin, bayar, daftar, dan login tidak dimasukkan.
export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ["/", "/trial", "/seminar", "/waiting-list", "/info", "/faq", "/refund", "/privasi", ...infoPages.map((p) => p.href)];
  return [
    ...pages.map((path) => ({
      url: `${BASE}${path === "/" ? "" : path}`,
      changeFrequency: "weekly" as const,
      priority: path === "/" ? 1 : 0.7,
    })),
    ...programs.map((p) => ({
      url: `${BASE}/program/${p.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.9,
    })),
  ];
}
