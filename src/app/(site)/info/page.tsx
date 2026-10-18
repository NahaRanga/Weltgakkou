import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { withBase } from "@/lib/base-path";
import { infoPages } from "@/lib/info-pages";

export const metadata: Metadata = { title: "Info", description: "Panduan jalur ke Jepang, kurikulum, cara belajar, bidang kerja, dan persyaratan." };

export default function InfoIndex() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <p className="font-jp text-sm font-medium text-red-700">お役立ち情報</p>
      <h1 className="mt-1 text-3xl font-bold text-stone-900">Info seputar belajar dan ke Jepang</h1>
      <p className="mt-3 max-w-2xl text-lg text-stone-600">
        Baru mulai cari tahu? Baca berurutan dari nomor 1. Tiap halaman ada tombol ke halaman berikutnya.
      </p>
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {infoPages.map((p, i) => (
          <Link
            key={p.href}
            href={p.href}
            className="group flex flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white transition hover:-translate-y-1 hover:border-red-700 hover:shadow-lg active:translate-y-0 active:scale-[0.99]"
          >
            <div className="relative">
              <Image src={withBase(p.image)} alt="" width={1200} height={896} className="aspect-[16/9] w-full object-cover" />
              <span className="absolute left-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-red-700 text-base font-bold text-white shadow">
                {i + 1}
              </span>
            </div>
            <div className="flex flex-1 flex-col p-5">
              <p className="text-lg font-semibold text-stone-900 group-hover:text-red-700">{p.title}</p>
              <p className="mt-1 flex-1 text-stone-600">{p.blurb}</p>
              <span className="mt-4 inline-flex w-fit items-center gap-1 rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white group-hover:bg-red-800">
                Baca <span aria-hidden className="transition group-hover:translate-x-0.5">→</span>
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
