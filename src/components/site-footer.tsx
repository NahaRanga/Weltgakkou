import Image from "next/image";
import Link from "next/link";
import { waLink } from "@/lib/site";
import { infoPages } from "@/lib/info-pages";
import { SocialLinks } from "@/components/social-links";
import { withBase } from "@/lib/base-path";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-stone-200 bg-white">
      <div className="mx-auto grid max-w-5xl gap-6 px-4 py-8 text-sm text-stone-600 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Image src={withBase("/logo-full.png")} alt="Weltgakko Academie" width={120} height={106} className="h-auto w-28" />
          <p className="mt-1">Kursus bahasa Jepang dan Jerman online untuk kerja, studi, dan JLPT.</p>
        </div>
        <div className="space-y-1">
          <Link href="/#program" className="block hover:text-stone-900">Program</Link>
          <Link href="/faq" className="block hover:text-stone-900">FAQ</Link>
          <Link href="/waiting-list" className="block hover:text-stone-900">Waiting list</Link>
          <Link href="/info" className="block hover:text-stone-900">Info</Link>
        </div>
        <div className="space-y-1">
          {infoPages.slice(0, 5).map((p) => (
            <Link key={p.href} href={p.href} className="block hover:text-stone-900">{p.title}</Link>
          ))}
        </div>
        <div className="space-y-1">
          <Link href="/tentang" className="block hover:text-stone-900">Tentang kami</Link>
          <Link href="/kontak" className="block hover:text-stone-900">Kontak</Link>
          <a href={waLink("Halo Weltgakko, saya mau tanya kelas.")} className="block hover:text-stone-900">
            Tanya lewat WhatsApp
          </a>
          <SocialLinks className="pt-2" />
        </div>
      </div>
    </footer>
  );
}
