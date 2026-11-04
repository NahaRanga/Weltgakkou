import type { Metadata } from "next";
import Image from "next/image";
import { withBase } from "@/lib/base-path";
import { WaitingListForm } from "@/components/waiting-list-form";
import { getProgram, programs } from "@/lib/programs";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Waiting list",
  description: "Daftar waiting list kelas bahasa Jepang dan Jerman Weltgakko.",
  path: "/waiting-list",
  image: { src: "/images/waiting-list.jpg", alt: "Ilustrasi daftar waiting list kelas Weltgakko" },
});

// ?program=jerman-a1 / ?program=jlpt-n4 memilih program otomatis (dipakai di CTA konten & link bio).
export default async function WaitingListPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const preselect = typeof sp.program === "string" && getProgram(sp.program) ? sp.program : undefined;
  const formPrograms = programs.map(({ slug, name, open }) => ({ slug, name, open }));
  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <Image
        src={withBase("/images/waiting-list.jpg")}
        alt="Ilustrasi notifikasi HP, tiket kelas, dan kalender"
        width={1600}
        height={1200}
        priority
        className="mb-8 w-full rounded-2xl"
      />
      <h1 className="text-3xl font-bold text-stone-900">Masuk waiting list</h1>
      <p className="mb-8 mt-2 text-stone-600">
        Kamu akan dikabari lebih dulu saat batch baru dibuka, beserta jadwal dan harga promonya.
      </p>
      <WaitingListForm programs={formPrograms} defaultProgram={preselect} />
    </div>
  );
}
