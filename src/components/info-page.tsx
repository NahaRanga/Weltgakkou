import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { withBase } from "@/lib/base-path";
import { infoPages } from "@/lib/info-pages";

// Kerangka halaman info: judul, pengantar, isi, lalu tautan ke halaman info lain dan ajakan daftar.
export function InfoPage({
  path,
  kicker,
  title,
  intro,
  image,
  children,
}: {
  path: string;
  kicker: string;
  title: string;
  intro: ReactNode;
  image?: { src: string; alt: string; width?: number; height?: number; wide?: boolean };
  children: ReactNode;
}) {
  const pic = image && (
    <Image
      src={withBase(image.src)}
      alt={image.alt}
      width={image.width ?? 1200}
      height={image.height ?? 896}
      priority
      className={`w-full rounded-3xl ${image.wide ? "mt-8" : ""}`}
    />
  );
  const others = infoPages.filter((p) => p.href !== path);
  return (
    <>
      <section className="bg-gradient-to-b from-red-50 via-white to-white">
        <div className={`mx-auto grid max-w-5xl items-center gap-8 px-4 py-12 ${image && !image.wide ? "md:grid-cols-[1fr_380px]" : ""}`}>
          <div>
            <Link href="/info" className="text-sm text-stone-500 hover:text-stone-800">
              ← Info
            </Link>
            <p className="font-jp mt-5 text-sm font-medium text-red-700">{kicker}</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">{title}</h1>
            <div className="mt-3 max-w-2xl text-lg text-stone-600">{intro}</div>
            {image?.wide && pic}
          </div>
          {image && !image.wide && pic}
        </div>
      </section>

      <div className="mx-auto max-w-5xl space-y-12 px-4 py-8">{children}</div>

      <section className="mx-auto max-w-5xl px-4 py-12">
        <div className="rounded-3xl bg-stone-900 px-6 py-8 text-white sm:px-10">
          <h2 className="text-xl font-bold">Mulai dari bahasanya dulu</h2>
          <p className="mt-2 max-w-xl text-stone-300">Apa pun jalurmu ke Jepang, bahasa adalah langkah pertama. Masuk waiting list untuk dikabari batch berikutnya.</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/waiting-list" className="rounded-lg bg-white px-5 py-2.5 font-semibold text-stone-900 hover:bg-stone-100">
              Masuk waiting list
            </Link>
            <Link href="/#program" className="rounded-lg border border-stone-600 px-5 py-2.5 font-semibold text-white hover:border-stone-400">
              Lihat program
            </Link>
          </div>
        </div>

        <h2 className="mt-12 text-lg font-semibold text-stone-900">Info lainnya</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {others.map((p) => (
            <Link key={p.href} href={p.href} className="rounded-xl border border-stone-200 bg-white p-4 hover:border-red-700">
              <p className="font-semibold text-stone-900">{p.title}</p>
              <p className="mt-1 text-sm text-stone-600">{p.blurb}</p>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}

export function Section({ title, subtitle, children }: { title: string; subtitle?: ReactNode; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-2xl font-bold text-stone-900">{title}</h2>
      {subtitle && <p className="mt-1 max-w-3xl text-stone-600">{subtitle}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

export function Note({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{children}</div>;
}
