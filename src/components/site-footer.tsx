import Image from "next/image";
import Link from "next/link";
import { waLink } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-stone-200 bg-white">
      <div className="mx-auto grid max-w-5xl gap-6 px-4 py-8 text-sm text-stone-600 sm:grid-cols-3">
        <div>
          <Image src="/logo-full.png" alt="Weltgakkou Academie" width={120} height={106} className="h-auto w-28" />
          <p className="mt-1">Kursus bahasa Jepang dan Jerman online untuk kerja, studi, dan JLPT.</p>
        </div>
        <div className="space-y-1">
          <Link href="/#program" className="block hover:text-stone-900">Program</Link>
          <Link href="/faq" className="block hover:text-stone-900">FAQ</Link>
          <Link href="/waiting-list" className="block hover:text-stone-900">Waiting list</Link>
        </div>
        <div>
          <a href={waLink("Halo Weltgakkou, saya mau tanya kelas.")} className="hover:text-stone-900">
            Tanya lewat WhatsApp
          </a>
        </div>
      </div>
    </footer>
  );
}
