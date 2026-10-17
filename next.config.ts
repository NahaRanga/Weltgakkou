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
  // Setelah pindah ke weltgakko.com: alamat lama dan www dialihkan permanen ke domain utama.
  async redirects() {
    if (process.env.NEXT_PUBLIC_BASE_PATH) return [];
    const oldHost = [{ type: "host" as const, value: "panjimuhammad.com" }];
    return [
      { source: "/weltgakko", has: oldHost, destination: "https://weltgakko.com/", permanent: true, basePath: false as const },
      { source: "/weltgakko/:path*", has: oldHost, destination: "https://weltgakko.com/:path*", permanent: true, basePath: false as const },
      { source: "/:path*", has: [{ type: "host" as const, value: "www.weltgakko.com" }], destination: "https://weltgakko.com/:path*", permanent: true, basePath: false as const },
    ];
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
