import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { UploadProofForm } from "@/components/upload-proof-form";
import { Notice } from "@/components/ui/form";
import { expireOverdueInvoices } from "@/lib/billing";
import { formatDateTime } from "@/lib/format";
import { formatRupiah } from "@/lib/programs";
import { waLink } from "@/lib/site";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const metadata: Metadata = { title: "Pembayaran", robots: { index: false } };

export default function PayPage({ params }: PageProps<"/bayar/[code]">) {
  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <Suspense fallback={<p className="text-stone-500">Memuat tagihan...</p>}>
        <PayContent params={params} />
      </Suspense>
    </div>
  );
}

async function PayContent({ params }: { params: PageProps<"/bayar/[code]">["params"] }) {
  const { code } = await params;
  const db = getSupabaseAdmin();
  if (!db || !/^WG[A-Z0-9]{8}$/.test(code)) notFound();
  await expireOverdueInvoices(db);

  const { data: invoice } = await db
    .from("invoices")
    .select("code, amount, unique_code, status, due_at, installment_no, reject_reason, enrollments(batches(name, programs(name, slug)))")
    .eq("code", code)
    .maybeSingle();
  if (!invoice) notFound();

  const batch = (invoice.enrollments as unknown as { batches: { name: string; programs: { name: string; slug: string } } }).batches;
  const bank = {
    name: process.env.BANK_NAME,
    number: process.env.BANK_ACCOUNT_NUMBER,
    holder: process.env.BANK_ACCOUNT_HOLDER,
  };
  const qris = process.env.NEXT_PUBLIC_QRIS_IMAGE_URL;
  const payable = invoice.status === "belum" || invoice.status === "ditolak";

  return (
    <>
      <p className="text-sm text-stone-500">Tagihan {invoice.code}</p>
      <h1 className="mt-1 text-2xl font-bold text-stone-900">
        {batch.programs.name} · {batch.name}
      </h1>
      {invoice.installment_no > 1 && <p className="text-stone-600">Cicilan bulan ke-{invoice.installment_no}</p>}

      <div className="mt-6 rounded-xl border border-stone-200 bg-white p-6">
        <p className="text-sm text-stone-600">Transfer tepat sebesar</p>
        <p className="mt-1 text-3xl font-bold tracking-tight text-stone-900">
          {formatRupiah(invoice.amount).slice(0, -3)}
          <span className="text-red-700">{formatRupiah(invoice.amount).slice(-3)}</span>
        </p>
        <p className="mt-1 text-xs text-stone-500">
          Harga {formatRupiah(invoice.amount - invoice.unique_code)} ditambah kode unik {invoice.unique_code} supaya
          pembayaranmu cepat dikenali.
        </p>
        {payable && <p className="mt-3 text-sm text-stone-700">Bayar sebelum {formatDateTime(invoice.due_at)} WIB.</p>}
      </div>

      <div className="mt-6 space-y-4">
        {invoice.status === "lunas" && (
          <Notice tone="ok">
            Pembayaran sudah dikonfirmasi. Cek email untuk link login, lalu{" "}
            <Link href="/belajar" className="font-semibold underline">
              masuk ke area belajar
            </Link>
            .
          </Notice>
        )}
        {invoice.status === "menunggu_verifikasi" && (
          <Notice tone="info">Bukti pembayaran sudah diterima dan sedang dicek admin.</Notice>
        )}
        {invoice.status === "kedaluwarsa" && (
          <Notice tone="error">
            Tagihan ini sudah lewat batas waktu.{" "}
            <Link href={`/program/${batch.programs.slug}`} className="font-semibold underline">
              Daftar ulang
            </Link>{" "}
            bila kuota masih ada.
          </Notice>
        )}
        {invoice.status === "ditolak" && (
          <Notice tone="error">
            Bukti sebelumnya belum bisa diterima{invoice.reject_reason ? `: ${invoice.reject_reason}` : ""}. Silakan unggah
            ulang.
          </Notice>
        )}

        {payable && (
          <>
            {bank.number && (
              <div className="rounded-xl border border-stone-200 bg-white p-5">
                <p className="font-semibold text-stone-900">Transfer bank</p>
                <p className="mt-1 text-stone-700">
                  {bank.name} <span className="font-mono font-semibold">{bank.number}</span>
                </p>
                <p className="text-stone-700">a.n. {bank.holder}</p>
              </div>
            )}
            {qris && (
              <div className="rounded-xl border border-stone-200 bg-white p-5">
                <p className="font-semibold text-stone-900">QRIS</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qris} alt="Kode QRIS Weltgakko" className="mx-auto mt-3 w-64" />
                <p className="mt-2 text-center text-sm text-stone-600">Masukkan nominal persis seperti di atas.</p>
              </div>
            )}
            <div className="rounded-xl border border-stone-200 bg-white p-5">
              <p className="mb-3 font-semibold text-stone-900">Sudah bayar? Unggah buktinya</p>
              <UploadProofForm code={invoice.code} />
            </div>
          </>
        )}

        <a
          href={waLink(`Halo Weltgakko, saya mau tanya tagihan ${invoice.code}.`)}
          className="block text-center text-sm text-stone-600 hover:text-stone-900"
        >
          Ada kendala? Hubungi admin lewat WhatsApp
        </a>
      </div>
    </>
  );
}
