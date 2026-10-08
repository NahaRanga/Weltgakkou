import Link from "next/link";
import { formatRupiah, type Program } from "@/lib/programs";

export function ProgramCard({ program }: { program: Program }) {
  return (
    <Link
      href={`/program/${program.slug}`}
      className="flex flex-col rounded-xl border border-stone-200 bg-white p-5 transition hover:border-red-700 hover:shadow-sm"
    >
      <div className="flex items-center justify-between">
        <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-700">{program.level}</span>
        {!program.open && <span className="text-xs text-stone-500">Segera dibuka</span>}
      </div>
      <h3 className="mt-3 text-lg font-semibold text-stone-900">{program.name}</h3>
      <p className="mt-1 flex-1 text-sm text-stone-600">{program.summary}</p>
      <p className="mt-4 text-sm text-stone-500">{program.duration}</p>
      <p className="font-semibold text-stone-900">
        {program.monthlyPrice
          ? `${formatRupiah(program.monthlyPrice)} / bulan`
          : program.upfrontPrice
            ? formatRupiah(program.upfrontPrice)
            : "Hubungi kami"}
      </p>
    </Link>
  );
}
