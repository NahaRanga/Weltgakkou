import type { Metadata } from "next";
import Link from "next/link";
import { InfoPage, Note, Section } from "@/components/info-page";

export const metadata: Metadata = {
  title: "Jalur ke Jepang",
  description: "Perbedaan magang, Tokutei Ginou (SSW), dan studi di Jepang, plus timeline dari belajar bahasa sampai berangkat.",
};

const paths = [
  {
    name: "Tokutei Ginou (SSW)",
    jp: "特定技能",
    who: "Pekerja berketerampilan di bidang tertentu, digaji setara pekerja Jepang.",
    language: "JFT-Basic (A2) atau JLPT N4",
    other: "Lulus ujian keterampilan bidang kerja",
    length: "Tipe 1 sampai 5 tahun. Tipe 2 bisa diperpanjang terus dan boleh membawa keluarga.",
    program: "jft-basic",
  },
  {
    name: "Magang",
    jp: "技能実習",
    who: "Peserta pelatihan kerja di perusahaan Jepang lewat LPK pengirim yang terdaftar.",
    language: "Umumnya setara N5 sampai N4, tergantung LPK dan perusahaan",
    other: "Seleksi dan pelatihan di LPK pengirim",
    length: "Umumnya 3 tahun, bisa sampai 5 tahun.",
    program: "jlpt-n5",
  },
  {
    name: "Studi",
    jp: "留学",
    who: "Pelajar di sekolah bahasa Jepang, sekolah kejuruan (senmon gakkō), atau universitas.",
    language: "Sekolah bahasa biasanya minta N5 atau bukti belajar sekitar 150 jam",
    other: "Bukti dana, ijazah, dan dokumen sekolah",
    length: "Sekolah bahasa 1 sampai 2 tahun, lalu bisa lanjut kuliah atau kerja.",
    program: "jlpt-n4",
  },
];

const steps = [
  { title: "Belajar bahasa dari nol", time: "4 sampai 7 bulan", body: "Kiso (hiragana dan katakana) 1 bulan, lalu N5 dan N4 atau program JFT-Basic. Di sinilah Weltgakkou membantu." },
  { title: "Ujian bahasa", time: "1 sampai 2 bulan", body: "JFT-Basic diadakan berkali-kali tiap bulan dengan komputer dan hasilnya keluar sekitar seminggu. JLPT hanya Juli dan Desember, hasilnya sekitar 2 bulan kemudian." },
  { title: "Ujian keterampilan bidang", time: "1 sampai 2 bulan", body: "Khusus SSW: ujian sesuai sektor, misalnya perawat lansia, restoran, atau pertanian. Perawat lansia juga ada tes bahasa khusus kaigo." },
  { title: "Pilih lembaga resmi dan siapkan dokumen", time: "2 sampai 4 minggu", body: "Daftar ke LPK atau agen penempatan yang punya izin resmi. Siapkan paspor, ijazah, dan dokumen lain." },
  { title: "Wawancara dengan perusahaan", time: "Bisa beberapa kali", body: "Mensetsu (面接) biasanya online. Perkenalan diri dan percakapan dasar dalam bahasa Jepang sangat menentukan." },
  { title: "COE dan visa", time: "2 sampai 4 bulan", body: "Perusahaan atau sekolah mengurus Certificate of Eligibility di Jepang, lalu visa diajukan di Kedutaan Jepang." },
  { title: "Berangkat ke Jepang", time: "Hari H", body: "Orientasi, lalu mulai kerja atau sekolah. Terus belajar, karena level bahasa memengaruhi gaji dan perpanjangan." },
];

export default function PathPage() {
  return (
    <InfoPage
      path="/jalur-ke-jepang"
      kicker="日本への道"
      title="Jalur ke Jepang dan timeline sampai berangkat"
      intro="Ada tiga jalur yang paling umum dari Indonesia. Semuanya dimulai dari bahasa Jepang, dan dari nol sampai berangkat biasanya butuh sekitar satu tahun."
      image={{ src: "/images/jalur-ke-jepang.jpg", alt: "Ilustrasi perjalanan dari belajar, dokumen, wawancara, visa, sampai terbang ke Jepang", width: 1200, height: 670, wide: true }}
    >
      <Section title="Tiga jalur yang umum">
        <div className="grid gap-4 md:grid-cols-3">
          {paths.map((p) => (
            <div key={p.name} className="flex flex-col rounded-2xl border border-stone-200 bg-white p-5">
              <p className="font-jp text-sm text-red-700">{p.jp}</p>
              <h3 className="text-lg font-semibold text-stone-900">{p.name}</h3>
              <p className="mt-1 text-sm text-stone-600">{p.who}</p>
              <dl className="mt-4 flex-1 space-y-2 text-sm">
                <div>
                  <dt className="text-stone-500">Syarat bahasa</dt>
                  <dd className="font-medium text-stone-900">{p.language}</dd>
                </div>
                <div>
                  <dt className="text-stone-500">Syarat lain</dt>
                  <dd className="font-medium text-stone-900">{p.other}</dd>
                </div>
                <div>
                  <dt className="text-stone-500">Lama tinggal</dt>
                  <dd className="font-medium text-stone-900">{p.length}</dd>
                </div>
              </dl>
              <Link href={`/program/${p.program}`} className="mt-4 text-sm font-semibold text-red-700 hover:underline">
                Program yang cocok →
              </Link>
            </div>
          ))}
        </div>
        <p className="mt-3 text-sm text-stone-500">
          Pemerintah Jepang berencana mengganti program magang dengan sistem baru bernama Ikusei Shūrō (育成就労) mulai 2027. Selalu cek aturan terbaru dari lembaga resmi.
        </p>
      </Section>

      <Section title="Timeline dari nol sampai berangkat" subtitle="Contoh untuk jalur Tokutei Ginou. Lama tiap tahap berbeda untuk setiap orang dan perusahaan.">
        <ol className="relative space-y-6 border-l-2 border-red-200 pl-6">
          {steps.map((s, i) => (
            <li key={s.title} className="relative">
              <span className="absolute -left-[37px] flex h-7 w-7 items-center justify-center rounded-full bg-red-700 text-sm font-bold text-white">{i + 1}</span>
              <div className="flex flex-wrap items-baseline gap-x-3">
                <h3 className="font-semibold text-stone-900">{s.title}</h3>
                <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">{s.time}</span>
              </div>
              <p className="mt-1 text-stone-600">{s.body}</p>
            </li>
          ))}
        </ol>
        <div className="mt-6 rounded-2xl bg-red-50 p-5">
          <p className="font-semibold text-stone-900">Total perkiraan: 9 sampai 15 bulan dari nol</p>
          <p className="mt-1 text-stone-700">Yang paling bisa kamu percepat adalah tahap bahasa. Makin rutin belajar, makin cepat siap ujian dan wawancara.</p>
        </div>
      </Section>

      <Note>
        <p className="font-semibold">Weltgakkou adalah kursus bahasa, bukan penyalur kerja.</p>
        <p className="mt-1">
          Kami membantu kamu siap secara bahasa: ujian JLPT atau JFT-Basic dan wawancara. Untuk penempatan kerja, pilih LPK atau agen yang punya izin resmi dan cek
          izinnya di situs Kementerian Ketenagakerjaan atau Kementerian P2MI (dulu BP2MI). Hati-hati dengan tawaran yang meminta biaya besar di depan tanpa
          kejelasan.
        </p>
      </Note>
    </InfoPage>
  );
}
