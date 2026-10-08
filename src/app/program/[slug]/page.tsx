import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { WaitingListForm } from "@/components/waiting-list-form";
import { formatRupiah, getProgram, programs } from "@/lib/programs";

export function generateStaticParams() {
  return programs.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/program/[slug]">): Promise<Metadata> {
  const program = getProgram((await params).slug);
  return program ? { title: program.name, description: program.summary } : {};
}

export default async function ProgramPage({ params }: PageProps<"/program/[slug]">) {
  const program = getProgram((await params).slug);
  if (!program) notFound();

  const formPrograms = programs.map(({ slug, name, open }) => ({ slug, name, open }));

  return (
    <div className="mx-auto grid max-w-5xl gap-10 px-4 py-12 lg:grid-cols-[1fr_380px]">
      <div>
        <Link href="/#program" className="text-sm text-stone-500 hover:text-stone-800">
          ← Semua program
        </Link>
        <p className="mt-6 text-sm font-medium text-red-700">Level {program.level}</p>
        <h1 className="mt-1 text-3xl font-bold text-stone-900">{program.name}</h1>
        <p className="mt-3 text-lg text-stone-600">{program.summary}</p>

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
              Senin sampai Kamis kelas live lewat Google Meet, Jumat ujian mingguan. Link kelas, materi, dan nilai tersedia
              di area siswa setelah pendaftaran dikonfirmasi.
            </p>
          </>
        )}
      </div>

      <aside className="h-fit rounded-xl border border-stone-200 bg-white p-6 lg:sticky lg:top-6">
        <h2 className="text-lg font-semibold text-stone-900">
          {program.open ? "Daftar batch berikutnya" : "Kabari saya saat dibuka"}
        </h2>
        <p className="mb-4 mt-1 text-sm text-stone-600">Isi waiting list, tim kami menghubungi lewat WhatsApp.</p>
        <WaitingListForm programs={formPrograms} defaultProgram={program.slug} />
      </aside>
    </div>
  );
}
