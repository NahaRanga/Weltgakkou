import type { Metadata } from "next";
import Link from "next/link";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { isCertificateNo, loadCertificate } from "@/lib/certificates";

export const metadata: Metadata = {
  title: "Cek keaslian sertifikat",
  robots: { index: false, follow: false },
};

// Halaman publik untuk mengecek nomor yang tercetak di sertifikat PDF.
export default async function VerifyCertificatePage({ params }: PageProps<"/sertifikat/[no]">) {
  const { no } = await params;
  const number = decodeURIComponent(no).trim().toUpperCase();
  const db = getSupabaseAdmin();
  const cert = db && isCertificateNo(number) ? await loadCertificate(db, { number }) : null;

  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <p className="text-sm font-medium text-stone-500">Cek keaslian sertifikat</p>
      <h1 className="mt-1 font-mono text-2xl font-semibold text-stone-900">{number}</h1>
      {cert ? (
        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
          <p className="font-semibold text-emerald-900">✓ Sertifikat ini asli dan diterbitkan oleh Weltgakko.</p>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-stone-500">Nama</dt>
              <dd className="text-lg font-semibold text-stone-900">{cert.name}</dd>
            </div>
            <div>
              <dt className="text-stone-500">Program</dt>
              <dd className="text-stone-900">
                {cert.programName} · {cert.batchName}
              </dd>
            </div>
            <div>
              <dt className="text-stone-500">Periode</dt>
              <dd className="text-stone-900">
                {cert.period} · {cert.detail}
              </dd>
            </div>
            <div>
              <dt className="text-stone-500">Diterbitkan</dt>
              <dd className="text-stone-900">{cert.issuedOn}</dd>
            </div>
          </dl>
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-900">
          Nomor ini tidak ditemukan. Pastikan nomor diketik persis seperti di sertifikat (contoh: WG-26-ABC234). Bila masih
          tidak cocok, hubungi admin Weltgakko.
        </div>
      )}
      <p className="mt-8 text-sm text-stone-600">
        Sertifikat Weltgakko menyatakan siswa telah menyelesaikan kelas, bukan sertifikat resmi JLPT/JFT.{" "}
        <Link href="/" className="underline">
          Kembali ke beranda
        </Link>
      </p>
    </div>
  );
}
