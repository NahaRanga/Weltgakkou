import type { Metadata } from "next";

export const metadata: Metadata = { title: "FAQ", description: "Pertanyaan yang sering diajukan tentang kelas Weltgakko." };

const faqs = [
  {
    q: "Kelasnya live atau rekaman?",
    a: "Live lewat Zoom, Senin sampai Kamis. Jumat tes kemampuan mingguan, tanpa tekanan, untuk melihat progresmu. Materi pendukung bisa dibuka kapan saja di area siswa.",
  },
  {
    q: "Saya belum bisa hiragana sama sekali. Mulai dari mana?",
    a: "Mulai dari program Kiso selama satu bulan, lalu lanjut ke JLPT N5.",
  },
  {
    q: "Berapa orang dalam satu kelas?",
    a: "Maksimal 10 orang supaya setiap peserta sempat latihan bicara.",
  },
  {
    q: "Bagaimana cara bayar?",
    a: "Transfer bank atau QRIS. Bisa bayar per bulan atau sekali bayar dengan harga lebih hemat. Akun belajar dibuat setelah pembayaran dikonfirmasi.",
  },
  {
    q: "Apakah ada sertifikat?",
    a: "Ada sertifikat penyelesaian kursus setelah kursus selesai. Kalau berhalangan hadir, kamu bisa menonton rekaman kelasnya. Sertifikat JLPT atau JFT resmi tetap diperoleh dari ujian resminya.",
  },
  {
    q: "Apakah biaya ujian JLPT atau JFT sudah termasuk?",
    a: "Belum. Biaya ujian resmi dibayar peserta langsung ke penyelenggara ujian.",
  },
  {
    q: "Berapa lama dari nol sampai bisa berangkat ke Jepang?",
    a: "Biasanya 9 sampai 15 bulan: sekitar 4 sampai 7 bulan belajar bahasa, lalu ujian, wawancara, dan proses visa. Lihat halaman Jalur ke Jepang untuk timeline lengkapnya.",
  },
  {
    q: "Apa bedanya magang dan Tokutei Ginou?",
    a: "Magang adalah program pelatihan kerja lewat LPK pengirim, umumnya 3 tahun. Tokutei Ginou (SSW) adalah visa kerja berketerampilan dengan gaji setara pekerja Jepang, syaratnya JFT-Basic A2 atau JLPT N4 dan lulus ujian keterampilan bidang.",
  },
  {
    q: "Apakah Weltgakko menyalurkan kerja ke Jepang?",
    a: "Tidak. Weltgakko fokus di persiapan bahasa: JLPT, JFT-Basic, dan wawancara. Untuk penempatan kerja, pilih LPK atau agen yang punya izin resmi.",
  },
  {
    q: "Bisa ikut kursus sambil kerja atau kuliah?",
    a: "Bisa. Kelasnya online, dan kalau berhalangan kamu bisa menonton rekaman kelasnya. Ada juga paket rekaman untuk yang jadwalnya tidak tetap.",
  },
];

export default function FaqPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold text-stone-900">Pertanyaan umum</h1>
      <div className="mt-8 divide-y divide-stone-200 rounded-xl border border-stone-200 bg-white">
        {faqs.map((f) => (
          <details key={f.q} className="group p-5">
            <summary className="cursor-pointer list-none font-semibold text-stone-900 group-open:text-red-700">{f.q}</summary>
            <p className="mt-2 text-stone-700">{f.a}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
