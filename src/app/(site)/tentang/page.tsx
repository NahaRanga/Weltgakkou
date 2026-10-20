import type { Metadata } from "next";
import { InfoPage, Section } from "@/components/info-page";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Tentang Weltgakko",
  description: "Weltgakko adalah kursus bahasa Jepang dan Jerman online untuk anak muda Indonesia.",
  path: "/tentang",
  image: { src: "/images/tentang-kontak.jpg", alt: "Ilustrasi tim Weltgakko melambaikan tangan" },
});

const values = [
  { title: "Kelas kecil", body: "Maksimal 15 orang per kelas supaya semua dapat giliran bicara dan dikoreksi langsung." },
  { title: "Belajar tanpa tekanan", body: "Tes mingguan dipakai untuk melihat progres, bukan untuk menghukum. Ketinggalan kelas bisa diganti rekaman." },
  { title: "Fokus ke tujuan", body: "Materi diarahkan ke kebutuhan nyata: lulus JLPT atau JFT, siap wawancara, dan bisa bicara di tempat kerja." },
  { title: "Terjangkau", body: "Bisa bayar per bulan, dan ada paket rekaman yang lebih hemat." },
];

export default function AboutPage() {
  return (
    <InfoPage
      path="/tentang"
      kicker="世界学校"
      title="Tentang Weltgakko"
      intro={
        <>
          Nama Weltgakko gabungan dari <em>Welt</em> (dunia, bahasa Jerman) dan <span className="font-jp">学校</span> <em>gakkō</em> (sekolah, bahasa Jepang). Kami
          ingin jadi sekolah bahasa online yang membuka jalan anak muda Indonesia ke dunia, mulai dari Jepang dan Jerman.
        </>
      }
      image={{ src: "/images/tentang-kontak.jpg", alt: "Ilustrasi tim Weltgakko melambaikan tangan" }}
    >
      <Section title="Cara kami mengajar">
        <div className="grid gap-4 sm:grid-cols-2">
          {values.map((v) => (
            <div key={v.title} className="rounded-2xl border border-stone-200 bg-white p-5">
              <h3 className="font-semibold text-stone-900">{v.title}</h3>
              <p className="mt-1 text-stone-600">{v.body}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Pengajar">
        <p className="max-w-3xl text-stone-700">
          Materi disusun dan diajarkan oleh pengajar yang sehari-hari menyiapkan peserta untuk kerja di Jepang, jadi tahu betul apa yang ditanya saat ujian dan
          wawancara.
        </p>
      </Section>
    </InfoPage>
  );
}
