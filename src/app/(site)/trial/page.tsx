import type { Metadata } from "next";
import Image from "next/image";
import { connection } from "next/server";
import { Suspense } from "react";
import { TrialForm } from "@/components/trial-form";
import { WaitingListForm } from "@/components/waiting-list-form";
import { withBase } from "@/lib/base-path";
import { upcomingTrials } from "@/lib/batches";
import { verificationEnabled } from "@/lib/email-verification";
import { formatDay, formatTime } from "@/lib/format";
import { programs } from "@/lib/programs";
import { pageMetadata } from "@/lib/seo";
import { waLink } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  title: "Kelas trial gratis",
  description: "Coba satu kelas live bahasa Jepang lewat Zoom, gratis. Daftar cukup nama, email, dan WhatsApp.",
  path: "/trial",
});

const perks = [
  { title: "Sekali daftar, dua sesi", body: "Sabtu sore kenalan Jepang (budaya, jalur kerja, tanya jawab), Minggu pagi kelas live 60 menit bareng sensei. Semua lewat Zoom." },
  { title: "Mulai dari nol", body: "Hiragana pertama, angka, dan cara memperkenalkan diri dalam bahasa Jepang." },
  { title: "Gratis, tanpa kartu atau transfer", body: "Cukup nama, email, dan WhatsApp. Link kelas muncul di area belajar." },
];

export default function TrialPage() {
  return (
    <>
      <section className="bg-[#fff8ed]">
        <div className="mx-auto grid max-w-5xl items-center gap-8 px-4 py-10 sm:py-14 lg:grid-cols-[1fr_420px]">
          <div>
            <span className="inline-block rounded-full bg-amber-400 px-3 py-1 text-xs font-bold uppercase tracking-wide text-stone-900">Gratis</span>
            <h1 className="mt-3 text-4xl font-bold tracking-tight text-stone-900">Coba dulu kelas bahasa Jepang, gratis</h1>
            <p className="mt-3 text-lg text-stone-600">
              Biar kamu tahu rasanya belajar di Weltgakko sebelum ikut batch berbayar. Nggak ada kewajiban lanjut.
            </p>
            <ul className="mt-6 space-y-3">
              {perks.map((p) => (
                <li key={p.title} className="flex gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-700 text-sm font-bold text-white">✓</span>
                  <span>
                    <span className="font-semibold text-stone-900">{p.title}.</span> <span className="text-stone-600">{p.body}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <Image
            src={withBase("/images/kelas-online.jpg")}
            alt="Ilustrasi kelas online lewat video call bersama sensei"
            width={1600}
            height={1200}
            priority
            className="w-full rounded-3xl"
          />
        </div>
      </section>

      <section id="daftar" className="mx-auto max-w-2xl scroll-mt-20 px-4 py-12">
        <Suspense fallback={<p className="text-stone-500">Memuat jadwal...</p>}>
          <TrialSchedule />
        </Suspense>
      </section>
    </>
  );
}

async function TrialSchedule() {
  await connection(); // jadwal dan kuota dibaca saat request
  const trials = await upcomingTrials();

  if (trials.length === 0) {
    return (
      <div className="rounded-2xl border border-stone-200 bg-white p-6 text-center">
        <h2 className="text-xl font-bold text-stone-900">Jadwal kelas trial berikutnya segera diumumkan</h2>
        <p className="mt-2 text-stone-600">Isi data di bawah, nanti admin kabari kamu duluan lewat WhatsApp begitu jadwalnya dibuka.</p>
        <div className="mt-5 text-left">
          <WaitingListForm programs={programs} defaultProgram="jlpt-n5" trial />
        </div>
        <a href={waLink("Halo Weltgakko, saya mau ikut kelas trial gratis. Kapan jadwal berikutnya?")} className="mt-4 inline-block text-sm font-semibold text-red-700 hover:underline">
          Atau chat admin
        </a>
      </div>
    );
  }

  const options = trials.map((t) => {
    const when = t.firstSession ?? t.start_date;
    // Rangkaian beberapa sesi (mis. Sabtu + Minggu) ditampilkan semua.
    const label =
      t.sessionTimes.length > 1
        ? t.sessionTimes.map((s) => `${formatDay(s)} ${formatTime(s)} WIB`).join(" + ")
        : `${formatDay(when)}${t.firstSession ? ` · ${formatTime(t.firstSession)} WIB` : ""}`;
    return {
      id: t.id,
      label,
      detail: `${t.name} · ${t.schedule_label}`,
      seatsLeft: t.seatsLeft,
    };
  });

  return (
    <>
      <h2 className="text-2xl font-bold text-stone-900">Daftar kelas trial</h2>
      <p className="mt-1 text-stone-600">Pilih jadwal, isi data singkat, selesai. Kuota terbatas.</p>
      <div className="mt-6">
        <TrialForm options={options} verifyEmail={verificationEnabled()} />
      </div>
    </>
  );
}
