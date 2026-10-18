import type { Metadata } from "next";
import { Noto_Sans, Noto_Sans_JP } from "next/font/google";
import { Analytics } from "@/components/analytics";
import { defaultDescription, defaultTitle, openGraphFor, SITE_BASE } from "@/lib/seo";
import { site } from "@/lib/site";
import "./globals.css";

const notoSans = Noto_Sans({ variable: "--font-noto-sans", subsets: ["latin"] });
const notoJp = Noto_Sans_JP({ variable: "--font-noto-jp", subsets: ["latin"], weight: ["400", "700"] });

// Semua halaman dirender saat request. Kunci Supabase baru tersedia saat runtime (secret
// Cloudflare), jadi halaman yang dibangun statis saat build tidak bisa membaca sesi/data.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  // Dasar URL absolut untuk gambar preview link (og:image wajib absolut).
  metadataBase: new URL(SITE_BASE),
  title: { default: defaultTitle, template: `%s | ${site.name}` },
  description: defaultDescription,
  ...openGraphFor({ title: defaultTitle, description: defaultDescription, path: "/" }),
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={`${notoSans.variable} ${notoJp.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
