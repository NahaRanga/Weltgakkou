import type { Metadata } from "next";
import Link from "next/link";
import { InfoPage, Note, Section } from "@/components/info-page";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Kurikulum dan lama kursus",
  description: "Materi per bulan di setiap program bahasa Jepang Weltgakko dan berapa lama sampai N5, N4, N3, atau JFT-Basic.",
  path: "/kurikulum",
  image: { src: "/images/kurikulum.jpg", alt: "Ilustrasi anak muda menaiki tangga level bahasa Jepang" },
});

const ladder = [
  { level: "Kiso", months: 1, total: 1, slug: "kiso" },
  { level: "N5", months: 3, total: 4, slug: "jlpt-n5" },
  { level: "N4", months: 3, total: 7, slug: "jlpt-n4" },
  { level: "N3", months: 6, total: 13, slug: "jlpt-n3" },
];

const curricula = [
  {
    slug: "kiso",
    name: "Kiso: hiragana dan katakana",
    length: "1 bulan",
    months: [{ label: "Bulan 1", items: ["46 hiragana dan bunyi turunannya", "Katakana untuk kata serapan", "Salam, perkenalan diri, angka, dan jam"] }],
  },
  {
    slug: "jlpt-n5",
    name: "JLPT N5",
    length: "3 bulan",
    months: [
      { label: "Bulan 1", items: ["Pola kalimat dasar: wa, desu, masu", "Kata tunjuk, tempat, dan waktu", "Kanji angka dan hari"] },
      { label: "Bulan 2", items: ["Kata kerja bentuk masu dan te", "Kata sifat i dan na", "Percakapan belanja, arah, dan kegiatan harian"] },
      { label: "Bulan 3", items: ["Bentuk lampau dan ajakan", "Sekitar 100 kanji dan 800 kosakata", "Latihan soal dan simulasi JLPT N5"] },
    ],
  },
  {
    slug: "jlpt-n4",
    name: "JLPT N4",
    length: "3 bulan",
    months: [
      { label: "Bulan 1", items: ["Bentuk biasa (futsūkei) dan kalimat sambung", "Bentuk bisa dan bentuk kehendak", "Percakapan di tempat kerja"] },
      { label: "Bulan 2", items: ["Pasif, kausatif, dan memberi-menerima", "Keigo dasar untuk sopan santun", "Membaca pengumuman dan pesan pendek"] },
      { label: "Bulan 3", items: ["Sekitar 300 kanji dan 1.500 kosakata", "Latihan mendengar percakapan", "Simulasi JLPT N4"] },
    ],
  },
  {
    slug: "jlpt-n3",
    name: "JLPT N3",
    length: "6 bulan",
    months: [
      { label: "Bulan 1 sampai 2", items: ["Tata bahasa N3 yang paling sering keluar", "Kanji N3 bertahap", "Membaca teks pendek"] },
      { label: "Bulan 3 sampai 4", items: ["Membaca artikel dan email", "Mendengar percakapan alami", "Ungkapan sopan di kantor"] },
      { label: "Bulan 5 sampai 6", items: ["Sekitar 650 kanji dan 3.700 kosakata", "Strategi mengerjakan soal", "Simulasi JLPT N3 penuh"] },
    ],
  },
  {
    slug: "jft-basic",
    name: "JFT-Basic",
    length: "6 bulan",
    months: [
      { label: "Bulan 1 sampai 2", items: ["Huruf dan kosakata dasar", "Perkenalan diri untuk wawancara", "Percakapan sehari-hari"] },
      { label: "Bulan 3 sampai 4", items: ["Materi setara N4", "Membaca tanda, jadwal, dan pengumuman", "Bahasa di tempat kerja"] },
      { label: "Bulan 5 sampai 6", items: ["Format soal JFT-Basic berbasis komputer", "Simulasi tes A2", "Latihan mensetsu (wawancara)"] },
    ],
  },
];

export default function CurriculumPage() {
  return (
    <InfoPage
      path="/kurikulum"
      kicker="カリキュラム"
      title="Kurikulum dan lama kursus"
      intro="Belajar naik level bertahap. Dari belum bisa hiragana sampai N4 sekitar 7 bulan, dan sampai N3 sekitar 13 bulan."
      image={{ src: "/images/kurikulum.jpg", alt: "Ilustrasi anak muda menaiki tangga level bahasa Jepang menuju Jepang" }}
    >
      <Section title="Berapa lama sampai level tertentu?" subtitle="Dihitung dari nol, kalau ikut kelas secara rutin.">
        <div className="grid gap-3 sm:grid-cols-4">
          {ladder.map((l) => (
            <Link key={l.level} href={`/program/${l.slug}`} className="rounded-2xl border border-stone-200 bg-white p-5 hover:border-red-700">
              <p className="text-sm text-stone-500">+{l.months} bulan</p>
              <p className="text-2xl font-bold text-stone-900">{l.level}</p>
              <p className="mt-1 text-sm text-red-700">±{l.total} bulan dari nol</p>
            </Link>
          ))}
        </div>
        <p className="mt-3 text-sm text-stone-600">
          Jalur cepat untuk kerja Tokutei Ginou: Kiso 1 bulan lalu JFT-Basic 6 bulan, sekitar 7 bulan sampai siap ujian.
        </p>
      </Section>

      <Section title="Materi per bulan" subtitle="Setiap minggu ada kelas live, review, hafalan kosakata, dan tes kemampuan hari Jumat.">
        <div className="space-y-4">
          {curricula.map((c) => (
            <details key={c.slug} className="group rounded-2xl border border-stone-200 bg-white" open={c.slug === "jlpt-n5"}>
              <summary className="flex cursor-pointer list-none items-center justify-between p-5">
                <span className="font-semibold text-stone-900 group-open:text-red-700">{c.name}</span>
                <span className="text-sm text-stone-500">{c.length}</span>
              </summary>
              <div className="grid gap-4 border-t border-stone-100 p-5 sm:grid-cols-3">
                {c.months.map((m) => (
                  <div key={m.label}>
                    <p className="text-sm font-semibold text-red-700">{m.label}</p>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-stone-700">
                      {m.items.map((it) => (
                        <li key={it}>{it}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </details>
          ))}
        </div>
      </Section>

      <Note>Jumlah kanji dan kosakata adalah perkiraan umum untuk tiap level JLPT. Urutan materi bisa sedikit berbeda sesuai kebutuhan kelas.</Note>
    </InfoPage>
  );
}
