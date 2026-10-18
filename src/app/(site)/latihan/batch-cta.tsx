import Link from "next/link";
import { getOpenBatches } from "@/lib/batches";
import { formatDate, formatDay } from "@/lib/format";
import { getProgram } from "@/lib/programs";
import { waLink } from "@/lib/site";

// Ajakan ikut kelas di zona latihan: batch yang sedang buka untuk program yang disarankan.
export async function BatchCta({ slug, reason }: { slug: string; reason: string }) {
  const program = getProgram(slug);
  const batch = (await getOpenBatches(slug)).find((b) => b.seatsLeft > 0);
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
      <p className="font-semibold text-stone-900">{reason}</p>
      {batch ? (
        <p className="mt-1 text-sm text-stone-700">
          {batch.name} {program?.name} dibuka, mulai {formatDate(batch.start_date)}. Pendaftaran sampai {formatDay(batch.deadline)}, sisa {batch.seatsLeft} kursi.
        </p>
      ) : (
        <p className="mt-1 text-sm text-stone-700">Batch {program?.name ?? "berikutnya"} belum dibuka. Masuk waiting list supaya dikabari duluan.</p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          href={batch ? `/daftar/${batch.id}` : "/waiting-list"}
          className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800"
        >
          {batch ? "Daftar sekarang" : "Masuk waiting list"}
        </Link>
        {program && (
          <Link href={`/program/${program.slug}`} className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-800 hover:bg-stone-50">
            Lihat program {program.name}
          </Link>
        )}
        <a
          href={waLink(`Halo admin Weltgakko, saya habis coba latihan gratis dan mau tanya kelas ${program?.name ?? ""}.`)}
          target="_blank"
          rel="noreferrer"
          className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-800 hover:bg-stone-50"
        >
          Tanya admin
        </a>
      </div>
    </div>
  );
}
