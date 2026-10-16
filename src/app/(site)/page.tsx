import Link from "next/link";
import { ProgramCard } from "@/components/program-card";
import { programs } from "@/lib/programs";

const japanese = programs.filter((p) => p.language === "jp");
const german = programs.filter((p) => p.language === "de");

const reasons = [
  {
    title: "Kelas live, bukan video rekaman",
    body: "Belajar langsung bersama pengajar lewat Zoom, Senin sampai Kamis, dalam kelas kecil maksimal 10 orang.",
  },
  {
    title: "Ujian setiap Jumat",
    body: "Progres dicek tiap minggu supaya kamu tahu bagian mana yang perlu diulang sebelum ujian JLPT atau JFT.",
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

export default function Home() {
  return (
    <>
      <section className="bg-white">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:py-24">
          <p className="font-jp text-red-700">日本語を、オンラインで。</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-bold tracking-tight text-stone-900 sm:text-5xl">
            Kursus bahasa Jepang online dari nol sampai JLPT N3
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-stone-600">
            Kelas live kecil, ujian mingguan, dan jalur belajar yang jelas untuk kerja, studi, atau Tokutei Ginou di
            Jepang.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/waiting-list" className="rounded-lg bg-red-700 px-5 py-3 font-semibold text-white hover:bg-red-800">
              Masuk waiting list
            </Link>
            <Link href="#program" className="rounded-lg border border-stone-300 px-5 py-3 font-semibold text-stone-800 hover:border-stone-500">
              Lihat program
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-16">
        <div className="grid gap-6 sm:grid-cols-2">
          {reasons.map((r) => (
            <div key={r.title}>
              <h2 className="font-semibold text-stone-900">{r.title}</h2>
              <p className="mt-1 text-stone-600">{r.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="program" className="mx-auto max-w-5xl scroll-mt-8 px-4 py-8">
        <h2 className="text-2xl font-bold text-stone-900">Program bahasa Jepang</h2>
        <p className="mt-1 text-stone-600">Mulai dari Kiso bila belum bisa hiragana, lalu naik level per tiga sampai enam bulan.</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {japanese.map((p) => (
            <ProgramCard key={p.slug} program={p} />
          ))}
        </div>

        <h2 className="mt-14 text-2xl font-bold text-stone-900">Bahasa Jerman (segera)</h2>
        <p className="mt-1 text-stone-600">Untuk persiapan Ausbildung dan kerja di Jerman. Daftar waiting list untuk dikabari saat kelas dibuka.</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {german.map((p) => (
            <ProgramCard key={p.slug} program={p} />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-16">
        <div className="rounded-2xl bg-stone-900 px-6 py-10 text-white sm:px-10">
          <h2 className="text-2xl font-bold">Batch pertama segera dibuka</h2>
          <p className="mt-2 max-w-xl text-stone-300">
            Kuota tiap kelas terbatas. Orang di waiting list dikabari lebih dulu saat jadwal dan harga promo keluar.
          </p>
          <Link href="/waiting-list" className="mt-6 inline-block rounded-lg bg-white px-5 py-3 font-semibold text-stone-900 hover:bg-stone-100">
            Masuk waiting list
          </Link>
        </div>
      </section>
    </>
  );
}
