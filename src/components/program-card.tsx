import Image from "next/image";
import Link from "next/link";
import { withBase } from "@/lib/base-path";
import { displayPrice, formatRupiah, programImage, promoActive, type Program } from "@/lib/programs";

export function ProgramCard({ program }: { program: Program }) {
  const image = programImage(program);
  const promo = promoActive(program);
  const price = displayPrice(program);
  return (
    <Link
      href={`/program/${program.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white transition hover:-translate-y-0.5 hover:border-red-700 hover:shadow-lg"
    >
      {image && (
        <div className="aspect-[4/3] overflow-hidden bg-stone-100">
          <Image
            src={withBase(image.src)}
            alt={image.alt}
            width={800}
            height={600}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        </div>
      )}
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center justify-between">
          <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-700">
            {program.level}
          </span>
          {!program.open && (
            <span className="text-xs text-stone-500">Segera dibuka</span>
          )}
          {promo && (
            <span className="rounded-full bg-red-700 px-2 py-0.5 text-xs font-semibold text-white">Promo bulan ini</span>
          )}
        </div>
        <h3 className="mt-3 text-lg font-semibold text-stone-900">
          {program.name}
        </h3>
        <p className="mt-1 flex-1 text-sm text-stone-600">{program.summary}</p>
        <p className="mt-4 text-sm text-stone-500">{program.duration}</p>
        <p className="font-semibold text-stone-900">
          {promo && program.normalPrice && (
            <span className="mr-2 text-sm font-normal text-stone-400 line-through">{formatRupiah(program.normalPrice)}</span>
          )}
          {program.monthlyPrice
            ? `${formatRupiah(program.monthlyPrice)} / bulan`
            : price
              ? formatRupiah(price)
              : "Hubungi kami"}
        </p>
      </div>
    </Link>
  );
}
