import type { Metadata } from "next";
import Image from "next/image";
import { InfoPage, Section } from "@/components/info-page";
import { withBase } from "@/lib/base-path";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Cara belajar",
  description: "Alur belajar mingguan di Weltgakko: kelas live lewat Zoom, tes kemampuan Jumat, rekaman, dan pilihan paket.",
  path: "/cara-belajar",
  image: { src: "/images/kelas-online.jpg", alt: "Ilustrasi kelas online lewat video call bersama sensei" },
});

const week = [
  { day: "Senin sampai Kamis", title: "Kelas live lewat Zoom", body: "Belajar bareng sensei dalam kelas kecil, maksimal 15 orang, jadi semua sempat latihan bicara." },
  { day: "Jumat", title: "Tes kemampuan", body: "Tes santai tanpa tekanan. Bukan penentu lulus, cuma untuk melihat sampai mana kemampuanmu dan bagian mana yang perlu diulang." },
  { day: "Kapan saja", title: "Materi dan rekaman", body: "Ketinggalan kelas? Tonton rekamannya di area belajar, dan kamu tetap dihitung hadir." },
];

const packages = [
  {
    name: "Kelas live",
    points: ["Kelas Zoom bersama sensei", "Tes kemampuan tiap Jumat", "Rekaman pengganti kalau berhalangan", "Kalender kelas dan progres di area belajar", "Sertifikat penyelesaian kursus"],
  },
  {
    name: "Paket rekaman",
    points: ["Video pelajaran per bab, belajar sesuai waktumu", "Sekali bayar, akses beberapa bulan", "Progres tontonan tersimpan", "Cocok untuk yang jadwalnya tidak tetap", "Lebih hemat dari kelas live"],
  },
];

export default function HowPage() {
  return (
    <InfoPage
      path="/cara-belajar"
      kicker="勉強の流れ"
      title="Cara belajar di Weltgakko"
      intro="Semuanya online. Bisa sambil sekolah, kuliah, atau kerja, karena kelas yang terlewat bisa ditonton ulang."
      image={{ src: "/images/kelas-online.jpg", alt: "Ilustrasi kelas online lewat video call bersama sensei" }}
    >
      <Section title="Satu minggu belajar">
        <div className="grid gap-4 md:grid-cols-3">
          {week.map((w) => (
            <div key={w.day} className="rounded-2xl border border-stone-200 bg-white p-5">
              <p className="text-sm font-medium text-red-700">{w.day}</p>
              <h3 className="mt-1 font-semibold text-stone-900">{w.title}</h3>
              <p className="mt-1 text-sm text-stone-600">{w.body}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Mulai dalam 4 langkah">
        <ol className="grid gap-4 sm:grid-cols-4">
          {["Pilih program dan batch", "Isi formulir pendaftaran", "Bayar lewat transfer atau QRIS", "Dapat akun dan langsung masuk kelas"].map((s, i) => (
            <li key={s} className="rounded-2xl bg-red-50 p-5">
              <span className="text-2xl font-bold text-red-700">{i + 1}</span>
              <p className="mt-1 font-medium text-stone-900">{s}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section title="Pilih paket">
        <Image
          src={withBase("/images/paket-rekaman.jpg")}
          alt="Ilustrasi belajar lewat video rekaman di rumah, kapan saja"
          width={1200}
          height={896}
          className="mb-4 w-full rounded-3xl sm:max-w-md"
        />
        <div className="grid gap-4 md:grid-cols-2">
          {packages.map((p) => (
            <div key={p.name} className="rounded-2xl border border-stone-200 bg-white p-6">
              <h3 className="text-lg font-semibold text-stone-900">{p.name}</h3>
              <ul className="mt-3 space-y-2 text-stone-700">
                {p.points.map((pt) => (
                  <li key={pt} className="flex gap-2">
                    <span className="text-red-700">✓</span>
                    {pt}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="mt-3 text-sm text-stone-600">Harga tiap paket ada di halaman masing-masing program.</p>
      </Section>
    </InfoPage>
  );
}
