import type { Metadata } from "next";
import Link from "next/link";
import { infoPages } from "@/lib/info-pages";

export const metadata: Metadata = { title: "Info", description: "Panduan jalur ke Jepang, kurikulum, cara belajar, bidang kerja, dan persyaratan." };

export default function InfoIndex() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <p className="font-jp text-sm font-medium text-red-700">お役立ち情報</p>
      <h1 className="mt-1 text-3xl font-bold text-stone-900">Info seputar belajar dan ke Jepang</h1>
      <p className="mt-3 max-w-2xl text-lg text-stone-600">Semua yang biasanya ditanyakan sebelum mulai kursus: jalurnya apa saja, berapa lama, dan apa yang perlu disiapkan.</p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {infoPages.map((p) => (
          <Link key={p.href} href={p.href} className="group rounded-2xl border border-stone-200 bg-white p-6 transition hover:-translate-y-0.5 hover:border-red-700 hover:shadow-lg">
            <p className="text-lg font-semibold text-stone-900 group-hover:text-red-700">{p.title} →</p>
            <p className="mt-1 text-stone-600">{p.blurb}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
