import type { Metadata } from "next";
import { InfoPage, Note, Section } from "@/components/info-page";

export const metadata: Metadata = {
  title: "Persyaratan umum",
  description: "Syarat dan dokumen yang biasanya diminta perusahaan, LPK, atau sekolah untuk kerja dan studi di Jepang.",
};

const common = [
  { title: "Usia", body: "Umumnya 18 sampai sekitar 30 tahun untuk kerja. Ada perusahaan yang menerima sampai usia lebih tinggi." },
  { title: "Pendidikan", body: "Biasanya minimal SMA atau SMK sederajat. Beberapa bidang lebih suka lulusan jurusan terkait." },
  { title: "Kesehatan", body: "Sehat jasmani dan rohani, dibuktikan dengan medical check-up. Beberapa bidang menilai tinggi atau berat badan dan penglihatan." },
  { title: "Penampilan", body: "Banyak perusahaan meminta tanpa tato dan tanpa tindik selain anting untuk perempuan." },
  { title: "Bahasa Jepang", body: "JFT-Basic A2 atau JLPT N4 untuk Tokutei Ginou. Untuk magang dan sekolah bahasa biasanya setara N5." },
  { title: "Sikap", body: "Disiplin, mau belajar, dan siap tinggal jauh dari keluarga. Ini sering dinilai saat wawancara." },
];

const documents = ["KTP", "Kartu keluarga", "Akta kelahiran", "Ijazah dan transkrip terakhir", "Paspor", "Pas foto", "Surat keterangan sehat", "SKCK", "Surat izin orang tua atau wali", "Sertifikat bahasa Jepang (JLPT atau JFT)"];

export default function RequirementsPage() {
  return (
    <InfoPage
      path="/persyaratan"
      kicker="応募条件"
      title="Persyaratan umum ke Jepang"
      intro="Ini syarat yang paling sering diminta. Syarat pastinya ditentukan oleh perusahaan, LPK, atau sekolah yang kamu tuju."
      image={{ src: "/images/persyaratan.jpg", alt: "Ilustrasi menyiapkan paspor, ijazah, pas foto, dan checklist dokumen" }}
    >
      <Section title="Syarat yang sering diminta">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {common.map((c) => (
            <div key={c.title} className="rounded-2xl border border-stone-200 bg-white p-5">
              <h3 className="font-semibold text-stone-900">{c.title}</h3>
              <p className="mt-1 text-sm text-stone-600">{c.body}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Dokumen yang biasanya disiapkan" subtitle="Siapkan dari sekarang, terutama paspor, karena pembuatannya butuh waktu.">
        <ul className="grid gap-2 sm:grid-cols-2">
          {documents.map((d) => (
            <li key={d} className="flex items-center gap-2 rounded-lg bg-white px-4 py-3 text-stone-800 ring-1 ring-stone-200">
              <span className="text-red-700">☐</span>
              {d}
            </li>
          ))}
        </ul>
      </Section>

      <Note>
        <p className="font-semibold">Untuk ikut kursus di Weltgakko tidak ada seleksi.</p>
        <p className="mt-1">Siapa pun boleh belajar, berapa pun usianya. Persyaratan di atas hanya gambaran umum untuk tahap setelah kursus, yaitu saat mendaftar kerja atau sekolah di Jepang.</p>
      </Note>
    </InfoPage>
  );
}
