import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Bila dipasang di sub-path (misalnya panjimuhammad.com/weltgakko).
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || undefined,
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
