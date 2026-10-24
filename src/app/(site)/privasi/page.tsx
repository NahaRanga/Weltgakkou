import type { Metadata } from "next";
import { InfoPage, Note, Section } from "@/components/info-page";
import { pageMetadata } from "@/lib/seo";
import { site, waLink } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  title: "Kebijakan privasi",
  description: "Data apa yang dikumpulkan Weltgakko, untuk apa dipakai, di mana disimpan, dan cara meminta data kamu dihapus.",
  path: "/privasi",
});

// Ditautkan dari layar izin "Masuk dengan Google" (Google Cloud, project Weltgakko). Sesuaikan bila data yang dikumpulkan berubah.
const collected = [
  { what: "Data akun", detail: "Nama, nomor WhatsApp, email, dan password (disimpan terenkripsi). Bila masuk dengan Google: nama dan email dari akun Google kamu." },
  { what: "Data pendaftaran kelas", detail: "Isian formulir daftar seperti domisili, pendidikan, pekerjaan, akun TikTok/Instagram, tujuan belajar, dan program yang diminati." },
  { what: "Data pembayaran", detail: "Tagihan, nominal, dan foto bukti transfer yang kamu unggah. Kami tidak menyimpan nomor kartu atau data rekening kamu." },
  { what: "Data belajar", detail: "Kehadiran kelas, rekaman yang ditonton, dan hasil latihan atau tes." },
  { what: "Data teknis", detail: "Cookie sesi login, dan statistik kunjungan dari Cloudflare Web Analytics. Pixel iklan Meta/TikTok hanya di halaman publik bila kami pasang, tidak di area belajar, pembayaran, atau halaman masuk." },
];

const uses = [
  "Membuat akun dan membuka area belajar kamu.",
  "Memproses pendaftaran, tagihan, dan verifikasi pembayaran.",
  "Menghubungi kamu lewat WhatsApp atau email soal kelas, jadwal, dan pembayaran.",
  "Mengabari batch baru untuk program yang kamu minati.",
  "Memperbaiki materi dan layanan berdasarkan hasil belajar.",
];

export default function PrivacyPage() {
  return (
    <InfoPage
      path="/privasi"
      kicker="プライバシー"
      title="Kebijakan privasi"
      intro="Kami hanya mengumpulkan data yang dibutuhkan untuk menjalankan kursus. Data kamu tidak dijual dan tidak dibagikan untuk iklan pihak lain."
    >
      <Section title="Data yang kami kumpulkan">
        <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
          {collected.map((c, i) => (
            <div key={c.what} className={`p-5 ${i > 0 ? "border-t border-stone-200" : ""}`}>
              <p className="font-semibold text-stone-900">{c.what}</p>
              <p className="mt-1 text-sm text-stone-600">{c.detail}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Untuk apa data dipakai">
        <ul className="list-disc space-y-2 pl-5 text-stone-700">
          {uses.map((u) => (
            <li key={u}>{u}</li>
          ))}
        </ul>
      </Section>

      <Section title="Di mana data disimpan">
        <p className="text-stone-700">
          Data disimpan di layanan database Supabase dan situs dijalankan di Cloudflare. Akses hanya untuk admin dan pengajar Weltgakko sesuai
          tugasnya; pengajar hanya melihat data siswa di kelasnya. Cadangan data dienkripsi.
        </p>
      </Section>

      <Section title="Hak kamu">
        <ul className="list-disc space-y-2 pl-5 text-stone-700">
          <li>Meminta salinan data kamu.</li>
          <li>Memperbaiki data yang salah.</li>
          <li>Meminta akun dan data kamu dihapus. Data pembayaran bisa tetap kami simpan sepanjang dibutuhkan untuk catatan keuangan.</li>
        </ul>
        <p className="mt-4 text-stone-700">
          Hubungi kami lewat email{" "}
          <a href={`mailto:${site.email}`} className="font-medium text-red-700 underline">
            {site.email}
          </a>{" "}
          atau WhatsApp.
        </p>
        <a
          href={waLink("Halo Weltgakko, saya mau bertanya soal data pribadi saya.")}
          className="mt-5 inline-block rounded-lg bg-red-700 px-5 py-2.5 font-semibold text-white hover:bg-red-800"
        >
          Hubungi lewat WhatsApp
        </a>
      </Section>

      <Note>Kebijakan ini bisa diperbarui. Perubahan penting kami umumkan di situs ini.</Note>
    </InfoPage>
  );
}
