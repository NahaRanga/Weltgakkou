import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { BannerStripShell } from "@/components/banner-strip-shell";
import { withBase } from "@/lib/base-path";
import { openBatches, upcomingTrials, type OpenBatch } from "@/lib/batches";
import { formatDay, formatTime, requestTime } from "@/lib/format";
import { seminarWhen, upcomingSeminars } from "@/lib/seminars";

const DAY = 86400_000;

// Sisa hari sampai tenggat, dibulatkan ke atas (hari tenggat sendiri = 1).
function daysLeft(deadline: string) {
  return Math.max(1, Math.ceil((new Date(deadline).getTime() - requestTime()) / DAY));
}

function Urgency({ batch, className = "" }: { batch: OpenBatch; className?: string }) {
  const days = daysLeft(batch.deadline);
  if (days > 3) return null;
  return (
    <span className={`inline-block rounded-full bg-red-600 px-2.5 py-0.5 text-xs font-bold text-white ${className}`}>
      {days === 1 ? "Hari terakhir!" : `Tinggal ${days} hari lagi`}
    </span>
  );
}

const shortDay = (iso: string) => formatDay(iso).replace(/ \d{4}$/, "");

// Pita tipis di atas header semua halaman publik. Hilang sendiri bila tidak ada batch buka.
export async function BatchOpenStrip() {
  await connection();
  const [batch] = await openBatches();
  if (!batch) return null;
  return (
    <BannerStripShell>
      <Link
        href={`/daftar/${batch.id}`}
        className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 bg-red-700 px-4 py-2 text-center text-sm text-white hover:bg-red-800"
      >
        <span className="font-semibold">
          {batch.name} {batch.programName} dibuka
        </span>
        <span className="text-red-100">· Pendaftaran sampai {shortDay(batch.deadline)}</span>
        {batch.seatsLeft <= 5 && <span className="text-red-100">· Sisa {batch.seatsLeft} kursi</span>}
        <span className="font-semibold underline underline-offset-2">Daftar sekarang →</span>
      </Link>
    </BannerStripShell>
  );
}

// Kotak besar di beranda. Tanpa batch buka, kembali ke ajakan waiting list.
export async function BatchOpenCard() {
  await connection();
  const [batch] = await openBatches();
  return (
    <div className="grid items-center gap-8 overflow-hidden rounded-3xl bg-stone-900 px-6 py-10 text-white sm:px-10 md:grid-cols-[1fr_320px]">
      {batch ? (
        <div>
          <Urgency batch={batch} className="mb-3" />
          <p className="text-sm font-semibold uppercase tracking-wide text-red-300">Pendaftaran dibuka</p>
          <h2 className="mt-1 text-2xl font-bold sm:text-3xl">
            {batch.name} {batch.programName}
          </h2>
          <dl className="mt-4 grid gap-2 text-stone-200 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-stone-400">Mulai</dt>
              <dd className="font-semibold text-white">{formatDay(batch.start_date)}</dd>
            </div>
            <div>
              <dt className="text-xs text-stone-400">Jadwal</dt>
              <dd className="font-semibold text-white">{batch.schedule_label}</dd>
            </div>
            <div>
              <dt className="text-xs text-stone-400">Pendaftaran ditutup</dt>
              <dd className="font-semibold text-white">
                {formatDay(batch.deadline)}, {formatTime(batch.deadline)} WIB
              </dd>
            </div>
            <div>
              <dt className="text-xs text-stone-400">Kuota</dt>
              <dd className="font-semibold text-white">
                Sisa {batch.seatsLeft} dari {batch.quota} kursi
              </dd>
            </div>
          </dl>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href={`/daftar/${batch.id}`} className="rounded-lg bg-red-600 px-5 py-3 font-semibold text-white hover:bg-red-500">
              Daftar sekarang
            </Link>
            <Link
              href={`/program/${batch.programSlug}`}
              className="rounded-lg border border-stone-600 px-5 py-3 font-semibold text-white hover:border-stone-300"
            >
              Lihat program
            </Link>
          </div>
        </div>
      ) : (
        <div>
          <h2 className="text-2xl font-bold">Batch berikutnya segera dibuka</h2>
          <p className="mt-2 max-w-xl text-stone-300">
            Kuota tiap kelas terbatas. Orang di waiting list dikabari lebih dulu saat jadwal dan harga promo keluar.
          </p>
          <Link href="/waiting-list" className="mt-6 inline-block rounded-lg bg-white px-5 py-3 font-semibold text-stone-900 hover:bg-stone-100">
            Masuk waiting list
          </Link>
        </div>
      )}
      <Image
        src={withBase("/images/waiting-list.jpg")}
        alt="Ilustrasi notifikasi HP dan tiket kelas"
        width={1600}
        height={1200}
        className="hidden w-full rounded-2xl md:block"
      />
    </div>
  );
}

// Banner kelas trial di bawah hero beranda. Jadwal dari batch trial di database,
// jadi banner hilang sendiri setelah kelas trial lewat.
export async function TrialBanner() {
  await connection();
  const [trial] = await upcomingTrials();
  if (!trial) return null;
  const when = trial.firstSession ?? trial.start_date;
  return (
    <section className="mx-auto max-w-5xl px-4 pt-10">
      <div className="flex flex-col gap-5 rounded-3xl border-2 border-amber-300 bg-amber-50 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div>
          <span className="inline-block rounded-full bg-amber-400 px-3 py-1 text-xs font-bold uppercase tracking-wide text-stone-900">
            Gratis
          </span>
          <h2 className="mt-3 text-2xl font-bold text-stone-900">Coba dulu kelas trial, gratis</h2>
          <p className="mt-1 text-lg font-semibold text-red-700">
            {formatDay(when)}
            {trial.firstSession && ` · ${formatTime(trial.firstSession)} WIB`}
          </p>
          <p className="mt-1 text-stone-700">
            Satu pertemuan live lewat Zoom bareng sensei: hiragana pertama, angka, dan perkenalan diri.{" "}
            {trial.seatsLeft > 0 ? "Kuota terbatas." : "Kuota penuh, lihat jadwal lain."}
          </p>
        </div>
        <Link href="/trial" className="shrink-0 rounded-xl bg-red-700 px-6 py-4 text-center text-lg font-bold text-white shadow-sm hover:bg-red-800">
          Daftar gratis
        </Link>
      </div>
    </section>
  );
}

// Kotak seminar gratis di beranda. Hilang sendiri bila tidak ada jadwal (atau migrasi 0007 belum jalan).
export async function SeminarBanner() {
  await connection();
  const [seminar] = await upcomingSeminars();
  if (!seminar) return null;
  return (
    <section className="mx-auto max-w-5xl px-4 pt-6">
      <div className="flex flex-col gap-5 rounded-3xl border-2 border-red-200 bg-red-50 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div>
          <span className="inline-block rounded-full bg-red-700 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">Seminar gratis</span>
          <h2 className="mt-3 text-2xl font-bold text-stone-900">{seminar.title}</h2>
          <p className="mt-1 text-lg font-semibold text-red-700">{seminarWhen(seminar)}</p>
          <p className="mt-1 text-stone-700">Jalur kerja dan kuliah ke Jepang, syarat bahasa, budaya, plus mini pelajaran. Online lewat Zoom.</p>
        </div>
        <Link href="/seminar" className="shrink-0 rounded-xl bg-red-700 px-6 py-4 text-center text-lg font-bold text-white shadow-sm hover:bg-red-800">
          Daftar seminar
        </Link>
      </div>
    </section>
  );
}
