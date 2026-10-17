import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { RegisterForm } from "@/components/register-form";
import { verificationEnabled } from "@/lib/email-verification";
import { seatsTaken } from "@/lib/billing";
import { formatDate } from "@/lib/format";
import { formatRupiah } from "@/lib/programs";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const metadata: Metadata = { title: "Daftar kelas" };

export default function RegisterPage({ params }: PageProps<"/daftar/[batchId]">) {
  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <Suspense fallback={<p className="text-stone-500">Memuat...</p>}>
        <RegisterContent params={params} />
      </Suspense>
    </div>
  );
}

async function RegisterContent({ params }: { params: PageProps<"/daftar/[batchId]">["params"] }) {
  const { batchId } = await params;
  const db = getSupabaseAdmin();
  if (!db || !/^[0-9a-f-]{36}$/.test(batchId)) notFound();

  const { data: batch } = await db
    .from("batches")
    .select("id, name, status, quota, mode, start_date, schedule_label, programs(slug, name, monthly_price, upfront_price, months, recording_price, recording_months)")
    .eq("id", batchId)
    .maybeSingle();
  if (!batch) notFound();
  const program = batch.programs as unknown as {
    slug: string;
    name: string;
    monthly_price: number | null;
    upfront_price: number | null;
    months: number | null;
    recording_price: number | null;
    recording_months: number;
  };
  const isRecording = batch.mode === "rekaman";

  const full = !isRecording && (await seatsTaken(db, batch.id)) >= batch.quota;
  const closed = batch.status !== "buka" || full;

  return (
    <>
      <Link href={`/program/${program.slug}`} className="text-sm text-stone-500 hover:text-stone-800">
        ← {program.name}
      </Link>
      <h1 className="mt-4 text-3xl font-bold text-stone-900">
        {isRecording ? `Paket rekaman ${program.name}` : `Daftar ${program.name}`}
      </h1>
      <p className="mt-1 text-stone-600">
        {isRecording
          ? `Video materi per bab, ditonton kapan saja selama ${program.recording_months} bulan sejak pembayaran diterima.`
          : `${batch.name} · mulai ${formatDate(batch.start_date)} · ${batch.schedule_label}`}
      </p>

      <div className="mt-8">
        {closed ? (
          <p className="rounded-lg bg-stone-100 p-4 text-stone-800">
            {full ? "Kuota batch ini sudah penuh." : "Pendaftaran batch ini sudah ditutup."}{" "}
            <Link href="/waiting-list" className="font-semibold underline">
              Masuk waiting list
            </Link>{" "}
            untuk batch berikutnya.
          </p>
        ) : (
          <RegisterForm
            batchId={batch.id}
            verifyEmail={verificationEnabled()}
            upfrontLabel={
              isRecording
                ? program.recording_price
                  ? `${formatRupiah(program.recording_price)} · akses ${program.recording_months} bulan`
                  : undefined
                : program.upfront_price
                  ? formatRupiah(program.upfront_price)
                  : undefined
            }
            monthlyLabel={
              !isRecording && program.monthly_price
                ? `${formatRupiah(program.monthly_price)} x ${program.months ?? 1} bulan`
                : undefined
            }
          />
        )}
      </div>
    </>
  );
}
