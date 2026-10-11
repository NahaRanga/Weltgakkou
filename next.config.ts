import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Cache Components belum didukung adapter Cloudflare (OpenNext): halaman jadi hang.
  cacheComponents: false,

  // Gambar disajikan apa adanya; optimasi Cloudflare Images berbayar.
  images: { unoptimized: true },
  experimental: {
    // Foto bukti transfer dikirim lewat Server Action (batas file 5 MB).
    serverActions: { bodySizeLimit: "6mb" },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;

// Supaya `next dev` bisa memakai binding Cloudflare saat dibutuhkan.
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();
