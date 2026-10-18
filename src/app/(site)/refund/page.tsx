import type { Metadata } from "next";
import { InfoPage, Note, Section } from "@/components/info-page";
import { waLink } from "@/lib/site";

export const metadata: Metadata = {
  title: "Kebijakan refund",
  description: "Aturan pengembalian uang dan pindah batch di Weltgakko: kapan uang kembali, berapa persen, dan cara memintanya.",
};

// Aturan disepakati winata 2026-10-18 (rencana-ui-trust.md, P6). Ubah di sini bila kebijakan berubah.
const rules = [
  { when: "Batal sebelum kelas pertama", result: "Uang kembali 90%", detail: "10% dipotong untuk biaya administrasi." },
  { when: "Batal di minggu pertama kelas", result: "Uang kembali 50%", detail: "Atau pindah ke batch berikutnya tanpa biaya tambahan." },
  { when: "Setelah minggu pertama", result: "Tidak ada refund", detail: "Kamu tetap boleh pindah ke batch berikutnya satu kali." },
  { when: "Kelas dibatalkan oleh Weltgakko", result: "Uang kembali 100%", detail: "Misalnya kuota tidak terpenuhi. Kamu bebas pilih uang kembali penuh atau pindah batch." },
  { when: "Paket rekaman", result: "Tidak ada refund", detail: "Video langsung bisa diakses setelah pembayaran dikonfirmasi." },
];

const steps = [
  "Chat admin lewat WhatsApp dan sebutkan kode tagihan (contoh: WG1A2B3C4D) yang ada di halaman pembayaranmu.",
  "Tulis alasan singkat dan pilih: uang kembali atau pindah batch (bila tersedia).",
  "Admin mengecek tanggal pengajuan terhadap jadwal kelas, lalu mengonfirmasi jumlahnya.",
  "Uang ditransfer ke rekening pengirim paling lambat 7 hari kerja setelah dikonfirmasi.",
];

export default function RefundPage() {
  return (
    <InfoPage
      path="/refund"
      kicker="返金ポリシー"
      title="Kebijakan refund"
      intro="Aturan pengembalian uang yang jelas sebelum kamu transfer. Patokannya tanggal kamu mengajukan ke admin dibanding jadwal kelas pertama batch-mu."
    >
      <Section title="Berapa uang yang kembali">
        <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
          {rules.map((r, i) => (
            <div key={r.when} className={`grid gap-1 p-5 sm:grid-cols-[1fr_180px] sm:gap-6 ${i > 0 ? "border-t border-stone-200" : ""}`}>
              <div>
                <p className="font-semibold text-stone-900">{r.when}</p>
                <p className="mt-1 text-sm text-stone-600">{r.detail}</p>
              </div>
              <p className="font-semibold text-red-700 sm:text-right">{r.result}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Kalau bayar cicilan bulanan" subtitle="Aturan di atas berlaku untuk pembayaran bulan pertama. Untuk bulan berikutnya:">
        <ul className="list-disc space-y-2 pl-5 text-stone-700">
          <li>Cicilan bulan yang sedang berjalan tidak dikembalikan.</li>
          <li>Setelah kamu berhenti, bulan berikutnya tidak ditagih lagi.</li>
        </ul>
      </Section>

      <Section title="Cara mengajukan refund">
        <ol className="grid gap-4 sm:grid-cols-2">
          {steps.map((s, i) => (
            <li key={s} className="rounded-2xl bg-red-50 p-5">
              <span className="text-2xl font-bold text-red-700">{i + 1}</span>
              <p className="mt-1 text-stone-800">{s}</p>
            </li>
          ))}
        </ol>
        <a
          href={waLink("Halo Weltgakko, saya mau mengajukan refund. Kode tagihan saya: ")}
          className="mt-5 inline-block rounded-lg bg-red-700 px-5 py-2.5 font-semibold text-white hover:bg-red-800"
        >
          Ajukan lewat WhatsApp
        </a>
      </Section>

      <Note>
        Kebijakan ini bisa diperbarui. Perubahan tidak berlaku mundur untuk pembayaran yang sudah masuk.
      </Note>
    </InfoPage>
  );
}
