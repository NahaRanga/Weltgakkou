import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { withBase } from "@/lib/base-path";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { getOpenBatches, getRecordingPackage } from "@/lib/batches";
import { formatDate } from "@/lib/format";
import { WaitingListForm } from "@/components/waiting-list-form";
import { formatRupiah, getProgram, programImage, programs } from "@/lib/programs";
import { pageMetadata } from "@/lib/seo";

export function generateStaticParams() {
  return programs.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/program/[slug]">): Promise<Metadata> {
  const program = getProgram((await params).slug);
  if (!program) return {};
  return pageMetadata({
    title: program.name,
    description: program.summary,
    path: `/program/${program.slug}`,
    image: programImage(program) ?? undefined,
  });
}

export default async function ProgramPage({ params }: PageProps<"/program/[slug]">) {
  const program = getProgram((await params).slug);
  if (!program) notFound();

  const formPrograms = programs.map(({ slug, name, open }) => ({ slug, name, open }));
  const image = programImage(program);

  return (
    <div className="mx-auto grid max-w-5xl gap-10 px-4 py-12 lg:grid-cols-[1fr_380px]">
      <div>
        <Link href="/#program" className="text-sm text-stone-500 hover:text-stone-800">
          ← Semua program
        </Link>
        <p className="mt-6 text-sm font-medium text-red-700">Level {program.level}</p>
        <h1 className="mt-1 text-3xl font-bold text-stone-900">{program.name}</h1>
        <p className="mt-3 text-lg text-stone-600">{program.summary}</p>
        {image && (
          <Image
            src={withBase(image.src)}
            alt={image.alt}
            width={1600}
            height={1200}
            priority
            className="mt-6 w-full rounded-2xl sm:max-w-lg"
          />
        )}

        <dl className="mt-8 grid grid-cols-2 gap-4 rounded-xl border border-stone-200 bg-white p-5 sm:grid-cols-3">
          <div>
            <dt className="text-sm text-stone-500">Durasi</dt>
            <dd className="font-semibold text-stone-900">{program.duration}</dd>
          </div>
          {program.monthlyPrice && (
            <div>
              <dt className="text-sm text-stone-500">Per bulan</dt>
              <dd className="font-semibold text-stone-900">{formatRupiah(program.monthlyPrice)}</dd>
            </div>
          )}
          {program.upfrontPrice && (
            <div>
              <dt className="text-sm text-stone-500">Sekali bayar</dt>
              <dd className="font-semibold text-stone-900">{formatRupiah(program.upfrontPrice)}</dd>
            </div>
          )}
        </dl>

        <h2 className="mt-10 text-xl font-semibold text-stone-900">Yang dipelajari</h2>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-stone-700">
          {program.topics.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>

        {program.language === "jp" && (
          <>
            <h2 className="mt-10 text-xl font-semibold text-stone-900">Jadwal mingguan</h2>
            <p className="mt-2 text-stone-700">
              Senin sampai Kamis kelas live lewat Zoom, Jumat tes kemampuan untuk melihat sampai mana progresmu. Link kelas, materi, dan nilai tersedia
              di area siswa setelah pendaftaran dikonfirmasi.
            </p>
          </>
        )}
      </div>

      <aside className="h-fit space-y-6 lg:sticky lg:top-6">
        <Suspense fallback={null}>
          <OpenBatches slug={program.slug} />
        </Suspense>
        <Suspense fallback={null}>
          <RecordingPackageOffer slug={program.slug} />
        </Suspense>
        <div className="rounded-xl border border-stone-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-stone-900">
          {program.open ? "Belum cocok jadwalnya?" : "Kabari saya saat dibuka"}
        </h2>
        <p className="mb-4 mt-1 text-sm text-stone-600">Isi waiting list, tim kami menghubungi lewat WhatsApp.</p>
        <WaitingListForm programs={formPrograms} defaultProgram={program.slug} />
        </div>
      </aside>
    </div>
  );
}

async function OpenBatches({ slug }: { slug: string }) {
  await connection(); // kuota batch selalu dibaca saat request, bukan saat build
  const batches = await getOpenBatches(slug);
  if (batches.length === 0) return null;
  return (
    <div className="rounded-xl border-2 border-red-700 bg-white p-6">
      <h2 className="text-lg font-semibold text-stone-900">Pendaftaran dibuka</h2>
      <ul className="mt-3 space-y-3">
        {batches.map((b) => (
          <li key={b.id} className="rounded-lg bg-stone-50 p-3">
            <p className="font-semibold text-stone-900">{b.name}</p>
            <p className="text-sm text-stone-600">
              Mulai {formatDate(b.start_date)} · {b.schedule_label}
            </p>
            <p className="text-sm text-stone-600">{b.seatsLeft > 0 ? `Sisa ${b.seatsLeft} kursi` : "Kuota penuh"}</p>
            {b.seatsLeft > 0 && (
              <Link href={`/daftar/${b.id}`} className="mt-2 inline-block rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800">
                Daftar batch ini
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

async function RecordingPackageOffer({ slug }: { slug: string }) {
  await connection();
  const pkg = await getRecordingPackage(slug);
  if (!pkg) return null;
  return (
    <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
      <Image src={withBase("/images/paket-rekaman.jpg")} alt="Ilustrasi belajar lewat video rekaman" width={1200} height={896} className="aspect-[2/1] w-full object-cover" />
      <div className="p-6">
      <p className="text-sm font-medium text-red-700">Paket rekaman video</p>
      <h2 className="mt-1 text-lg font-semibold text-stone-900">Belajar mandiri, kapan saja</h2>
      <p className="mt-1 text-sm text-stone-600">
        Video materi per bab{pkg.videos ? ` (${pkg.videos} video)` : ""}, bisa ditonton ulang selama {pkg.months} bulan. Cocok kalau jadwalmu
        nggak bisa ikut kelas live.
      </p>
      <p className="mt-3 text-xl font-bold text-stone-900">{formatRupiah(pkg.price)}</p>
      <Link href={`/daftar/${pkg.batchId}`} className="mt-3 inline-block rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-700">
        Beli paket rekaman
      </Link>
      </div>
    </div>
  );
}
