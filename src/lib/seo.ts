import type { Metadata } from "next";
import { site } from "@/lib/site";

// Alamat utama situs untuk link preview (OG). Sama dengan sitemap: tidak bergantung SITE_URL runtime.
export const SITE_BASE = "https://weltgakko.com";

type OgImage = { url: string; width: number; height: number; alt: string };

// Gambar preview default (1200×630) saat link dibagikan di WhatsApp, IG, Facebook, dll.
export const defaultOgImage: OgImage = {
  url: "/og/weltgakko.jpg",
  width: 1200,
  height: 630,
  alt: "Weltgakko, kursus bahasa Jepang online lewat Zoom",
};

export const defaultTitle = `${site.name}: ${site.tagline}`;
export const defaultDescription =
  "Kelas live bahasa Jepang online bersama pengajar berpengalaman LPK. Kiso, JLPT N5, N4, N3, dan JFT-Basic dengan tes kemampuan setiap Jumat.";

export function openGraphFor({ title, description, path, image }: { title: string; description: string; path: string; image?: OgImage }) {
  const images = [image ?? defaultOgImage];
  return {
    openGraph: { type: "website", siteName: site.name, locale: "id_ID", url: path, title, description, images },
    twitter: { card: "summary_large_image", title, description, images },
  } satisfies Metadata;
}

// Metadata halaman publik: judul, deskripsi, dan preview link dengan gambar halaman itu sendiri.
// openGraph di halaman menggantikan milik layout seluruhnya (merge dangkal), jadi selalu diisi lengkap.
export function pageMetadata({
  title,
  description,
  path,
  image,
}: {
  title: string;
  description: string;
  path: string;
  image?: { src: string; alt: string; width?: number; height?: number };
}): Metadata {
  const og = image && { url: image.src, width: image.width ?? 1200, height: image.height ?? 896, alt: image.alt };
  return { title, description, ...openGraphFor({ title: `${title} | ${site.name}`, description, path, image: og }) };
}
