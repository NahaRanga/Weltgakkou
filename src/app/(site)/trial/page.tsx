import type { Metadata } from "next";
import Image from "next/image";
import { connection } from "next/server";
import { Suspense } from "react";
import { TrialForm } from "@/components/trial-form";
import { WaitingListForm } from "@/components/waiting-list-form";
import { withBase } from "@/lib/base-path";
import { upcomingTrials, type OpenBatch } from "@/lib/batches";
import { formatDay, formatTime } from "@/lib/format";
import { programs, type Language } from "@/lib/programs";
import { pageMetadata } from "@/lib/seo";
import { waLink } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  title: "Kelas trial gratis",
  description: "Coba kelas live bahasa Jepang atau Jerman lewat Zoom, gratis. Daftar cukup nama, email, dan WhatsApp.",
  path: "/trial",
});

type Copy = { title: string; perks: { title: string; body: string }[] };

const freePerk = {
  title: "Gratis, tanpa kartu atau transfer",
  body: "Cukup isi nama, email, dan WhatsApp. Tanpa kode verifikasi, tanpa login. Link Zoom dikirim ke email/WhatsApp.",
};

// Teks halaman per bahasa trial yang sedang dibuka. "mix" = ada trial Jepang dan Jerman sekaligus (atau belum ada jadwal).
const copy: Record<Language | "mix", Copy> = {
  jp: {
    title: "Coba dulu kelas bahasa Jepang, gratis",
    perks: [
      { title: "Sekali daftar, dua sesi", body: "Sabtu sore kenalan Jepang (budaya, jalur kerja, tanya jawab), Minggu pagi kelas live 60 menit bareng sensei. Semua lewat Zoom." },
      { title: "Mulai dari nol", body: "Hiragana pertama, angka, dan cara memperkenalkan diri dalam bahasa Jepang." },
      freePerk,
    ],
  },
  de: {
    title: "Coba dulu kelas bahasa Jerman, gratis",
    perks: [
      { title: "Sekali daftar, dua sesi", body: "Sabtu sore kenalan Jerman (budaya, jalur kuliah dan Ausbildung, tanya jawab), Minggu pagi kelas live 60 menit bareng pengajar. Semua lewat Zoom." },
      { title: "Mulai dari nol", body: "Alfabet dan pelafalan, angka, dan cara memperkenalkan diri dalam bahasa Jerman." },
      freePerk,
    ],
  },
  mix: {
    title: "Coba dulu kelas bahasa Jepang atau Jerman, gratis",
    perks: [
      { title: "Sekali daftar, dua sesi", body: "Sabtu sore kenalan negaranya (budaya, jalur kerja dan studi, tanya jawab), Minggu pagi kelas live 60 menit. Semua lewat Zoom." },
      { title: "Mulai dari nol", body: "Huruf dan pelafalan dasar, angka, dan cara memperkenalkan diri." },
      freePerk,
    ],
  },
};

// ?bahasa=jerman / ?bahasa=jepang menyaring jadwal (dipakai link promosi per bahasa).
function languageParam(v: string | string[] | undefined): Language | null {
  const s = (Array.isArray(v) ? v[0] : v)?.toLowerCase();
  if (s === "jerman" || s === "de") return "de";
  if (s === "jepang" || s === "jp") return "jp";
  return null;
}

export default function TrialPage({ searchParams }: PageProps<"/trial">) {
  return (
    <Suspense fallback={<p className="mx-auto max-w-5xl px-4 py-14 text-stone-500">Memuat jadwal...</p>}>
      <TrialContent searchParams={searchParams} />
    </Suspense>
  );
}

async function TrialContent({ searchParams }: { searchParams: PageProps<"/trial">["searchParams"] }) {
  await connection(); // jadwal dan kuota dibaca saat request
  const wanted = languageParam((await searchParams).bahasa);
  const all = await upcomingTrials();
  const trials = wanted ? all.filter((t) => t.language === wanted) : all;
  const languages = new Set(trials.map((t) => t.language));
  const lang: Language | "mix" = wanted ?? (languages.size === 1 ? [...languages][0] : "mix");
  const { title, perks } = copy[lang];

  return (
    <>
      <section className="bg-[#fff8ed]">
        <div className="mx-auto grid max-w-5xl items-center gap-8 px-4 py-10 sm:py-14 lg:grid-cols-[1fr_420px]">
          <div>
            <span className="inline-block rounded-full bg-amber-400 px-3 py-1 text-xs font-bold uppercase tracking-wide text-stone-900">Gratis</span>
            <h1 className="mt-3 text-4xl font-bold tracking-tight text-stone-900">{title}</h1>
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
            alt="Ilustrasi kelas online lewat video call bersama pengajar"
            width={1600}
            height={1200}
            priority
            className="w-full rounded-3xl"
          />
        </div>
      </section>

      <section id="daftar" className="mx-auto max-w-2xl scroll-mt-20 px-4 py-12">
        <TrialSchedule trials={trials} lang={lang} />
      </section>
    </>
  );
}

function TrialSchedule({ trials, lang }: { trials: OpenBatch[]; lang: Language | "mix" }) {

  if (trials.length === 0) {
    return (
      <div className="rounded-2xl border border-stone-200 bg-white p-6 text-center">
        <h2 className="text-xl font-bold text-stone-900">Jadwal kelas trial berikutnya segera diumumkan</h2>
        <p className="mt-2 text-stone-600">Isi data di bawah, nanti admin kabari kamu duluan lewat WhatsApp begitu jadwalnya dibuka.</p>
        <div className="mt-5 text-left">
          <WaitingListForm programs={programs} defaultProgram={lang === "de" ? "jerman-a1" : "jlpt-n5"} trial />
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
      language: t.language,
    };
  });

  return (
    <>
      <h2 className="text-2xl font-bold text-stone-900">Daftar kelas trial</h2>
      <p className="mt-1 text-stone-600">Pilih jadwal, isi data singkat, selesai. Kuota terbatas.</p>
      <div className="mt-6">
        <TrialForm options={options} />
      </div>
    </>
  );
}
