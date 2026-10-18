import Link from "next/link";
import { formatDate, formatDateTime } from "@/lib/format";
import { trialHref } from "@/lib/info-pages";
import { formatRupiah } from "@/lib/programs";
import { site } from "@/lib/site";

// Komponen tampilan area siswa (/belajar). Semua data datang lewat props,
// pengambilan data tetap di halaman.

export type StudentInvoice = {
  code: string;
  status: string;
  amount: number;
  installment_no: number;
  due_at: string;
  reject_reason: string | null;
  paid_at: string | null;
  payment_proofs: { uploaded_at: string }[] | null;
};

// Admin mengecek bukti transfer paling lambat 1x24 jam.
export const VERIFY_PROMISE = "maks 1×24 jam";

const STEPS = ["Daftar", "Bayar", "Dicek admin", "Kelas mulai"];

// Penunjuk langkah pendaftaran. `current` = indeks langkah yang sedang berjalan; STEPS.length = semua selesai.
export function JourneySteps({ current, problem = false }: { current: number; problem?: boolean }) {
  return (
    <ol className="grid grid-cols-4 gap-1 text-center" aria-label="Langkah pendaftaran">
      {STEPS.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={label} className="relative flex flex-col items-center gap-1.5">
            {i > 0 && (
              <span
                aria-hidden
                className={`absolute right-1/2 top-4 h-0.5 w-full -translate-y-1/2 ${done || active ? "bg-red-700" : "bg-stone-200"}`}
              />
            )}
            <span
              className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                done
                  ? "bg-red-700 text-white"
                  : active
                    ? problem
                      ? "border-2 border-amber-500 bg-amber-50 text-amber-700"
                      : "border-2 border-red-700 bg-white text-red-700"
                    : "border-2 border-stone-200 bg-white text-stone-400"
              }`}
            >
              {done ? "✓" : i + 1}
            </span>
            <span className={`text-xs leading-tight sm:text-sm ${active ? "font-semibold text-stone-900" : done ? "text-stone-700" : "text-stone-400"}`}>
              {label}
            </span>
            {active && <span className="sr-only">(langkah sekarang)</span>}
          </li>
        );
      })}
    </ol>
  );
}

const lastUpload = (inv: StudentInvoice) =>
  (inv.payment_proofs ?? []).map((p) => p.uploaded_at).sort().at(-1) ?? null;

// Kartu pendaftaran yang belum aktif: posisi langkah dan apa yang harus dilakukan sekarang.
export function PendingEnrollment({
  programName,
  batchName,
  startDate,
  scheduleLabel,
  invoice,
  programSlug,
}: {
  programName: string;
  batchName: string;
  startDate: string;
  scheduleLabel: string;
  invoice: StudentInvoice | null;
  programSlug: string | null;
}) {
  const status = invoice?.status ?? "belum";
  const step = status === "menunggu_verifikasi" ? 2 : status === "lunas" ? 3 : 1;
  const uploaded = invoice ? lastUpload(invoice) : null;

  return (
    <section className="mt-8 rounded-2xl border border-stone-200 bg-white p-5 sm:p-6">
      <p className="text-sm font-medium text-red-700">Pendaftaran kamu</p>
      <h2 className="text-xl font-semibold text-stone-900">
        {programName} · {batchName}
      </h2>
      <p className="mt-1 text-sm text-stone-600">
        Mulai {formatDate(startDate)} · {scheduleLabel}
      </p>

      <div className="mt-5">
        <JourneySteps current={step} problem={status === "ditolak" || status === "kedaluwarsa"} />
      </div>

      <div className="mt-5 rounded-xl bg-stone-50 p-4 text-sm text-stone-800">
        {!invoice || status === "belum" ? (
          <>
            <p className="font-semibold text-stone-900">Langkah sekarang: bayar tagihan</p>
            {invoice && (
              <p className="mt-1">
                Transfer tepat {formatRupiah(invoice.amount)} sebelum {formatDateTime(invoice.due_at)} WIB, lalu unggah buktinya di halaman
                tagihan.
              </p>
            )}
          </>
        ) : status === "menunggu_verifikasi" ? (
          <>
            <p className="font-semibold text-stone-900">Bukti transfer sudah kami terima</p>
            <p className="mt-1">
              {uploaded ? `Diunggah ${formatDateTime(uploaded)} WIB. ` : ""}Admin mengecek {VERIFY_PROMISE}. Setelah dikonfirmasi, kamu dapat
              email untuk atur password dan kelas muncul di halaman ini.
            </p>
          </>
        ) : status === "ditolak" ? (
          <>
            <p className="font-semibold text-amber-800">Bukti transfer belum bisa diterima</p>
            <p className="mt-1">
              {invoice.reject_reason ? `Alasan: ${invoice.reject_reason}. ` : ""}Unggah ulang bukti yang jelas di halaman tagihan, atau tanya
              admin lewat WhatsApp.
            </p>
          </>
        ) : status === "kedaluwarsa" ? (
          <>
            <p className="font-semibold text-amber-800">Tagihan sudah lewat batas waktu</p>
            <p className="mt-1">
              Kursi kamu belum terkunci. Daftar ulang selama kuota masih ada, atau hubungi admin kalau kamu sudah terlanjur transfer.
            </p>
          </>
        ) : (
          <p className="font-semibold text-stone-900">Pembayaran dikonfirmasi. Kelas segera aktif.</p>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        {invoice && (status === "belum" || status === "ditolak") && (
          <Link href={`/bayar/${invoice.code}`} className="rounded-lg bg-red-700 px-5 py-2.5 font-semibold text-white hover:bg-red-800">
            {status === "ditolak" ? "Unggah ulang bukti" : "Buka tagihan"}
          </Link>
        )}
        {invoice && status === "menunggu_verifikasi" && (
          <Link href={`/bayar/${invoice.code}`} className="rounded-lg border border-stone-300 px-5 py-2.5 font-semibold text-stone-800 hover:bg-stone-50">
            Lihat tagihan
          </Link>
        )}
        {status === "kedaluwarsa" && programSlug && (
          <Link href={`/program/${programSlug}`} className="rounded-lg bg-red-700 px-5 py-2.5 font-semibold text-white hover:bg-red-800">
            Daftar ulang
          </Link>
        )}
      </div>
    </section>
  );
}

// Tampilan untuk akun yang belum ikut kelas apa pun.
export function EmptyLearnState({ waHref }: { waHref: string }) {
  const steps = [
    { title: "Pilih program", body: "Mulai dari Kiso kalau belum bisa hiragana, atau langsung JLPT N5." },
    { title: "Daftar dan bayar", body: `Transfer sesuai tagihan, unggah bukti, admin cek ${VERIFY_PROMISE}.` },
    { title: "Masuk kelas Zoom", body: "Jadwal, tombol Masuk kelas, rekaman, dan nilai tes muncul di halaman ini." },
  ];
  return (
    <section className="mt-8 overflow-hidden rounded-2xl border border-stone-200 bg-white">
      <div className="bg-gradient-to-br from-red-700 to-red-600 p-6 text-white">
        <h2 className="text-2xl font-bold">Kamu belum ikut kelas</h2>
        <p className="mt-1 text-red-50">Begini caranya mulai belajar di Weltgakko. Masih ragu? Coba kelas gratis dulu.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/#program" className="rounded-lg bg-white px-5 py-2.5 font-semibold text-red-700 hover:bg-red-50">
            Lihat program
          </Link>
          <Link href={trialHref} className="rounded-lg border-2 border-white/80 px-5 py-2 font-semibold text-white hover:bg-white/10">
            Coba kelas gratis
          </Link>
        </div>
      </div>
      <ol className="grid gap-4 p-6 sm:grid-cols-3">
        {steps.map((s, i) => (
          <li key={s.title} className="flex gap-3 sm:block">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-50 font-bold text-red-700">{i + 1}</span>
            <div className="sm:mt-2">
              <p className="font-semibold text-stone-900">{s.title}</p>
              <p className="text-sm text-stone-600">{s.body}</p>
            </div>
          </li>
        ))}
      </ol>
      <p className="border-t border-stone-100 px-6 py-4 text-sm text-stone-600">
        Bingung pilih level?{" "}
        <a href={waHref} className="font-semibold text-red-700 hover:underline">
          Tanya admin lewat WhatsApp
        </a>
        , gratis.
      </p>
    </section>
  );
}

// Hal yang bikin tenang sebelum dan sesudah bayar. Hanya fakta yang benar-benar berlaku.
export function TrustPoints() {
  const points = [
    { icon: "👥", title: "Kelas kecil", body: "Maksimal 10 orang, semua sempat latihan bicara." },
    { icon: "▶", title: "Ada rekaman", body: "Berhalangan? Tonton rekamannya, tetap dihitung hadir." },
    { icon: "↩", title: "Refund jelas", body: "Batal sebelum kelas pertama, uang kembali 90%." },
    { icon: "💬", title: "Admin siap bantu", body: `Tanya lewat WhatsApp atau email ${site.email}.` },
  ];
  return (
    <section className="mt-8">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">Kenapa aman belajar di sini</h2>
      <ul className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {points.map((p) => (
          <li key={p.title} className="rounded-xl border border-stone-200 bg-white p-4">
            <span aria-hidden className="text-xl">
              {p.icon}
            </span>
            <p className="mt-1 font-semibold text-stone-900">{p.title}</p>
            <p className="text-sm text-stone-600">{p.body}</p>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-stone-500">
        Aturan lengkap ada di{" "}
        <Link href="/refund" className="underline hover:text-stone-800">
          kebijakan refund
        </Link>{" "}
        dan{" "}
        <Link href="/cara-belajar" className="underline hover:text-stone-800">
          cara belajar
        </Link>
        .
      </p>
    </section>
  );
}

// Panduan singkat sebelum kelas pertama; terbuka otomatis bila kelas pertama belum lewat.
export function FirstClassGuide({ open }: { open: boolean }) {
  const items = [
    { title: "Pasang Zoom", body: "Unduh aplikasi Zoom di HP atau laptop, lalu coba buka sekali supaya tidak telat saat kelas." },
    { title: "Siapkan alat tulis", body: "Buku tulis dan pulpen untuk latihan menulis. Materi dan slide dibagikan sensei di halaman ini." },
    {
      title: "Cara masuk kelas",
      body: "Buka halaman ini, tombol Masuk kelas aktif 15 menit sebelum mulai. Kehadiran tercatat otomatis.",
    },
    { title: "Tes Jumat santai", body: "Bukan ujian kelulusan. Hasilnya buat lihat kemajuanmu dan kesiapan ikut JLPT." },
    { title: "Berhalangan?", body: "Tidak apa-apa. Rekaman kelas muncul di sini dan tetap dihitung hadir." },
  ];
  return (
    <details open={open} className="group rounded-xl border border-sky-200 bg-sky-50 p-5 sm:p-6">
      <summary className="cursor-pointer font-semibold text-sky-950">Panduan sebelum kelas pertama</summary>
      <ol className="mt-4 grid gap-3 sm:grid-cols-2">
        {items.map((it, i) => (
          <li key={it.title} className="flex gap-3 rounded-lg bg-white p-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sm font-bold text-sky-800">{i + 1}</span>
            <div>
              <p className="font-semibold text-stone-900">{it.title}</p>
              <p className="text-sm text-stone-600">{it.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </details>
  );
}

const invoiceLabel: Record<string, [string, string]> = {
  belum: ["Belum dibayar", "bg-amber-50 text-amber-800"],
  menunggu_verifikasi: ["Sedang dicek", "bg-sky-50 text-sky-800"],
  lunas: ["Lunas", "bg-emerald-50 text-emerald-800"],
  ditolak: ["Bukti ditolak", "bg-red-50 text-red-800"],
  kedaluwarsa: ["Kedaluwarsa", "bg-stone-100 text-stone-600"],
};

// Riwayat tagihan semua kelas, terbaru di atas.
export function InvoiceHistory({ rows }: { rows: (StudentInvoice & { label: string })[] }) {
  if (rows.length === 0) return null;
  return (
    <details className="mt-8 rounded-xl border border-stone-200 bg-white p-5 sm:p-6">
      <summary className="cursor-pointer font-semibold text-stone-900">Riwayat pembayaran ({rows.length})</summary>
      <ul className="mt-3 divide-y divide-stone-100">
        {rows.map((inv) => {
          const [text, tone] = invoiceLabel[inv.status] ?? [inv.status, "bg-stone-100 text-stone-600"];
          return (
            <li key={inv.code} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
              <div>
                <p className="font-medium text-stone-900">
                  {inv.label}
                  {inv.installment_no > 1 ? ` · cicilan ke-${inv.installment_no}` : ""}
                </p>
                <p className="text-stone-500">
                  {inv.code} · {formatRupiah(inv.amount)}
                  {inv.paid_at ? ` · dibayar ${formatDate(inv.paid_at)}` : inv.status === "belum" ? ` · jatuh tempo ${formatDate(inv.due_at)}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${tone}`}>{text}</span>
                <Link href={`/bayar/${inv.code}`} className="text-xs font-semibold text-red-700 hover:underline">
                  Detail
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
    </details>
  );
}

// Tombol bantuan WhatsApp yang selalu terlihat di pojok kanan bawah.
export function HelpButton({ href }: { href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-3 font-semibold text-white shadow-lg hover:bg-[#1ebe5b] sm:bottom-6 sm:right-6"
    >
      <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5 fill-current">
        <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3Z" />
      </svg>
      <span>
        Butuh bantuan?<span className="hidden sm:inline"> Chat admin</span>
      </span>
    </a>
  );
}

// Sensei ditampilkan dengan inisial saja (keputusan winata 2026-10-18: nama/foto sensei belum dipajang).
export function teacherLabel(fullName: string | null | undefined) {
  const initial = fullName?.trim().charAt(0).toUpperCase();
  return initial ? `Sensei ${initial}.` : null;
}
