import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { BatchOpenCard, TrialBanner } from "@/components/batch-open-banner";
import { trialHref } from "@/lib/info-pages";
import { withBase } from "@/lib/base-path";
import { ProgramCard } from "@/components/program-card";
import { programs } from "@/lib/programs";
import { organizationJsonLd } from "@/lib/seo";

const japanese = programs.filter((p) => p.language === "jp");
const german = programs.filter((p) => p.language === "de");

const reasons = [
  {
    title: "Kelas live, bukan video rekaman",
    body: "Belajar langsung bersama pengajar lewat Zoom, Senin sampai Kamis, dalam kelas kecil maksimal 10 orang.",
  },
  {
    title: "Tes kemampuan tiap Jumat",
    body: "Bukan ujian yang menentukan lulus. Tes santai ini menunjukkan sampai mana kemampuanmu dan seberapa siap kamu ikut JLPT atau JFT.",
  },
  {
    title: "Pengajar dari dunia LPK",
    body: "Materi disusun oleh pengajar yang sehari-hari menyiapkan peserta untuk kerja di Jepang.",
  },
  {
    title: "Bisa bayar per bulan",
    body: "Pilih cicilan bulanan atau sekali bayar dengan potongan harga. Transfer bank atau QRIS.",
  },
];

const journey = [
  { title: "Belajar bahasa", time: "4–7 bulan" },
  { title: "Ujian JFT atau JLPT", time: "1–2 bulan" },
  { title: "Ujian keterampilan", time: "1–2 bulan" },
  { title: "Wawancara kerja", time: "beberapa minggu" },
  { title: "Visa dan berangkat", time: "2–4 bulan" },
];

export default function Home() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd()).replace(/</g, "\\u003c") }} />
      {/* Ilustrasi lebar: sisi kiri gambar kosong, jadi di layar lebar teks ditaruh di atasnya. */}
      <section className="relative overflow-hidden bg-[#fff8ed]">
        <Image
          src={withBase("/images/hero-wide.jpg")}
          alt="Ilustrasi tiga anak muda Indonesia belajar bahasa Jepang bersama lewat laptop dan HP"
          width={1600}
          height={893}
          priority
          className="absolute inset-y-0 right-0 hidden h-full w-auto max-w-none lg:block"
        />
        <div className="relative mx-auto max-w-6xl px-4 py-12 sm:py-16 lg:py-28">
          <div className="lg:max-w-[46%]">
            <p className="font-jp text-red-700">日本語を、オンラインで。</p>
            <h1 className="mt-3 max-w-3xl text-4xl font-bold tracking-tight text-stone-900 sm:text-5xl">
              Kursus bahasa Jepang online dari nol sampai JLPT N3
            </h1>
            <p className="mt-4 max-w-2xl text-lg text-stone-600">
              Kelas live kecil, tes kemampuan mingguan, dan jalur belajar yang jelas
              untuk kerja, studi, atau Tokutei Ginou di Jepang.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={trialHref}
                className="rounded-lg bg-red-700 px-5 py-3 font-semibold text-white hover:bg-red-800"
              >
                Coba kelas gratis
              </Link>
              <Link
                href="#program"
                className="rounded-lg border border-stone-300 px-5 py-3 font-semibold text-stone-800 hover:border-stone-500"
              >
                Lihat program
              </Link>
            </div>
          </div>
          <Image
            src={withBase("/images/hero-wide.jpg")}
            alt=""
            width={1600}
            height={893}
            priority
            className="-mx-4 mt-4 aspect-[5/4] w-[calc(100%+2rem)] max-w-none object-cover object-right sm:mx-0 sm:w-full sm:aspect-[16/9] lg:hidden"
          />
        </div>
      </section>

      <Suspense fallback={null}>
        <TrialBanner />
      </Suspense>

      <section className="mx-auto grid max-w-5xl items-center gap-10 px-4 py-16 lg:grid-cols-[0.9fr_1fr]">
        <Image
          src={withBase("/images/kelas-online.jpg")}
          alt="Ilustrasi kelas online lewat video call bersama sensei"
          width={1600}
          height={1200}
          className="w-full rounded-3xl"
        />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-1">
          {reasons.map((r) => (
            <div key={r.title}>
              <h2 className="font-semibold text-stone-900">{r.title}</h2>
              <p className="mt-1 text-stone-600">{r.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="program" className="mx-auto max-w-5xl scroll-mt-8 px-4 py-8">
        <h2 className="text-2xl font-bold text-stone-900">
          Program bahasa Jepang
        </h2>
        <p className="mt-1 text-stone-600">
          Mulai dari Kiso bila belum bisa hiragana, lalu naik level per tiga
          sampai enam bulan.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {japanese.map((p) => (
            <ProgramCard key={p.slug} program={p} />
          ))}
        </div>

        <h2 className="mt-14 text-2xl font-bold text-stone-900">
          Bahasa Jerman (segera)
        </h2>
        <p className="mt-1 text-stone-600">
          Untuk persiapan Ausbildung dan kerja di Jerman. Daftar waiting list
          untuk dikabari saat kelas dibuka.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {german.map((p) => (
            <ProgramCard key={p.slug} program={p} />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 pt-16">
        <h2 className="text-2xl font-bold text-stone-900">Dari nol sampai berangkat ke Jepang</h2>
        <p className="mt-1 text-stone-600">Rata-rata sekitar satu tahun. Tahap bahasa adalah yang paling bisa kamu percepat.</p>
        <ol className="mt-6 grid gap-3 sm:grid-cols-5">
          {journey.map((j, i) => (
            <li key={j.title} className="rounded-2xl border border-stone-200 bg-white p-4">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-red-700 text-sm font-bold text-white">{i + 1}</span>
              <p className="mt-2 font-semibold text-stone-900">{j.title}</p>
              <p className="text-sm text-red-700">{j.time}</p>
            </li>
          ))}
        </ol>
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-red-700">
          <Link href="/jalur-ke-jepang" className="hover:underline">Lihat timeline lengkap →</Link>
          <Link href="/kurikulum" className="hover:underline">Kurikulum dan lama kursus →</Link>
          <Link href="/bidang-kerja" className="hover:underline">Bidang kerja Tokutei Ginou →</Link>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-16">
        <Suspense fallback={null}>
          <BatchOpenCard />
        </Suspense>
      </section>
    </>
  );
}
