import type { Metadata } from "next";
import { Noto_Sans, Noto_Sans_JP } from "next/font/google";
import { site } from "@/lib/site";
import "./globals.css";

const notoSans = Noto_Sans({ variable: "--font-noto-sans", subsets: ["latin"] });
const notoJp = Noto_Sans_JP({ variable: "--font-noto-jp", subsets: ["latin"], weight: ["400", "700"] });

// Semua halaman dirender saat request. Kunci Supabase baru tersedia saat runtime (secret
// Cloudflare), jadi halaman yang dibangun statis saat build tidak bisa membaca sesi/data.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: `${site.name}: ${site.tagline}`, template: `%s | ${site.name}` },
  description:
    "Kelas live bahasa Jepang online bersama pengajar berpengalaman LPK. Kiso, JLPT N5, N4, N3, dan JFT-Basic dengan ujian mingguan setiap Jumat.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={`${notoSans.variable} ${notoJp.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">{children}</body>
    </html>
  );
}
