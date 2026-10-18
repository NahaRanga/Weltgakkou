import type { Metadata } from "next";
import Image from "next/image";
import { withBase } from "@/lib/base-path";
import { WaitingListForm } from "@/components/waiting-list-form";
import { programs } from "@/lib/programs";

export const metadata: Metadata = {
  title: "Waiting list",
  description: "Daftar waiting list kelas bahasa Jepang dan Jerman Weltgakko.",
};

export default function WaitingListPage() {
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
      <WaitingListForm programs={formPrograms} />
    </div>
  );
}
