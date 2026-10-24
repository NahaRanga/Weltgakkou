import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { SeminarForm } from "@/components/seminar-form";
import { withBase } from "@/lib/base-path";
import { goals, seminarWhen, trialWhen, upcomingSeminars } from "@/lib/seminars";
import { pageMetadata } from "@/lib/seo";
import { waLink } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  title: "Seminar gratis Mengenal Jepang Lebih Dekat",
  description: "Seminar online gratis lewat Zoom lanjut kelas trial bahasa Jepang besoknya: jalur kerja dan kuliah ke Jepang, syarat bahasa, budaya. Sekali daftar.",
  path: "/seminar",
  image: { src: "/images/jalur-ke-jepang.jpg", alt: "Ilustrasi jalur berangkat ke Jepang" },
});

const agenda = [
  { title: "Jalur ke Jepang", body: "Kerja (SSW, magang), kuliah, dan beasiswa: bedanya apa dan cocok buat siapa." },
  { title: "Syarat bahasa", body: "JLPT dan JFT-Basic itu apa, level berapa yang dibutuhkan, berapa lama belajarnya." },
  { title: "Budaya dan kehidupan", body: "Kebiasaan kerja, sopan santun, dan hal kecil yang bikin kaget orang baru." },
  { title: "Mini pelajaran", body: "Salam dan perkenalan diri pertama kamu dalam bahasa Jepang." },
  { title: "Tanya jawab", body: "Tanya langsung apa pun soal Jepang dan belajar bahasanya." },
  { title: "Besoknya: kelas trial", body: "Satu kelas live bareng sensei: hiragana pertama, angka, dan perkenalan diri. Sekali daftar, langsung dapat dua-duanya." },
];

export default function SeminarPage() {
  return (
    <>
      <section className="bg-[#fff8ed]">
        <div className="mx-auto grid max-w-5xl items-center gap-8 px-4 py-10 sm:py-14 lg:grid-cols-[1fr_420px]">
          <div>
            <span className="inline-block rounded-full bg-amber-400 px-3 py-1 text-xs font-bold uppercase tracking-wide text-stone-900">Seminar gratis</span>
            <h1 className="mt-3 text-4xl font-bold tracking-tight text-stone-900">Mengenal Jepang Lebih Dekat</h1>
            <p className="mt-3 text-lg text-stone-600">
              Seminar online lewat Zoom buat kamu yang penasaran kerja, kuliah, atau sekadar belajar bahasa Jepang, lanjut kelas trial gratis besoknya. Satu kali daftar pakai nomor WhatsApp.
            </p>
            <ul className="mt-6 space-y-3">
              {agenda.map((a) => (
                <li key={a.title} className="flex gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-700 text-sm font-bold text-white">✓</span>
                  <span>
                    <span className="font-semibold text-stone-900">{a.title}.</span> <span className="text-stone-600">{a.body}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <Image
            src={withBase("/images/jalur-ke-jepang.jpg")}
            alt="Ilustrasi jalur berangkat ke Jepang"
            width={1200}
            height={670}
            priority
            className="w-full rounded-3xl"
          />
        </div>
      </section>

      <section id="daftar" className="mx-auto max-w-2xl scroll-mt-20 px-4 py-12">
        <Suspense fallback={<p className="text-stone-500">Memuat jadwal...</p>}>
          <SeminarSchedule />
        </Suspense>
        <p className="mt-6 text-center text-sm text-stone-500">
          Weltgakko adalah lembaga kursus bahasa, bukan agen penyalur kerja. Seminar ini gratis dan tanpa kewajiban ikut kelas.
        </p>
      </section>
    </>
  );
}

async function SeminarSchedule() {
  await connection(); // jadwal dan kuota dibaca saat request
  const seminars = await upcomingSeminars();
  const adminWa = waLink("Halo admin Weltgakko, saya mau tanya soal seminar Mengenal Jepang Lebih Dekat.");

  if (seminars.length === 0) {
    return (
      <div className="rounded-2xl border border-stone-200 bg-white p-6 text-center">
        <h2 className="text-xl font-bold text-stone-900">Jadwal seminar berikutnya segera diumumkan</h2>
        <p className="mt-2 text-stone-600">Sambil menunggu, kamu bisa coba kelas trial gratis atau chat admin.</p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <Link href="/trial" className="rounded-lg bg-red-700 px-5 py-3 font-semibold text-white hover:bg-red-800">
            Kelas trial gratis
          </Link>
          <a href={adminWa} target="_blank" rel="noreferrer" className="rounded-lg border border-stone-300 px-5 py-3 font-semibold text-stone-800 hover:bg-stone-50">
            Chat admin
          </a>
        </div>
      </div>
    );
  }

  return (
    <>
      <h2 className="text-2xl font-bold text-stone-900">Daftar seminar</h2>
      <p className="mb-6 mt-1 text-stone-600">Isi sekali untuk seminar dan kelas trial-nya. Link Zoom dan pengingat dikirim lewat WhatsApp.</p>
      <SeminarForm seminars={seminars.map((s) => ({ id: s.id, when: seminarWhen(s), trialWhen: trialWhen(s), full: s.full }))} goals={goals} adminWa={adminWa} />
    </>
  );
}
