import { chartColor } from "@/components/admin/ui";

type Point = { label: string; value: number };

function TableView({ data, format }: { data: Point[]; format: (v: number) => string }) {
  return (
    <details className="mt-3 text-xs text-stone-600">
      <summary className="cursor-pointer text-stone-500">Lihat tabel</summary>
      <table className="mt-2 w-full">
        <tbody>
          {data.map((d) => (
            <tr key={d.label} className="border-t border-stone-100">
              <td className="py-1">{d.label}</td>
              <td className="py-1 text-right tabular-nums">{format(d.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}

// Batang tegak untuk deret waktu (per bulan). Satu warna; label angka hanya di batang terakhir dan tertinggi.
export function ColumnChart({ data, format = String, height = 160 }: { data: Point[]; format?: (v: number) => string; height?: number }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const maxIndex = data.findIndex((d) => d.value === max);
  return (
    <div>
      <div className="relative" style={{ height }}>
        {[0.5, 1].map((t) => (
          <div key={t} className="absolute inset-x-0 border-t border-dashed border-stone-200" style={{ bottom: `${t * 100}%` }} />
        ))}
        <div className="absolute inset-0 flex items-end gap-1 border-b border-stone-300 sm:gap-2">
          {data.map((d, i) => {
            const showLabel = d.value > 0 && (i === data.length - 1 || i === maxIndex);
            return (
              <div key={d.label} className="group relative flex h-full flex-1 items-end justify-center" title={`${d.label}: ${format(d.value)}`}>
                <div
                  className="w-full max-w-10 rounded-t transition-opacity group-hover:opacity-80"
                  style={{ height: `${(d.value / max) * 100}%`, minHeight: d.value ? 2 : 0, background: chartColor }}
                />
                {showLabel && (
                  <span className="absolute -translate-y-1 whitespace-nowrap text-[11px] font-medium text-stone-700" style={{ bottom: `${(d.value / max) * 100}%` }}>
                    {format(d.value)}
                  </span>
                )}
                <span className="pointer-events-none absolute bottom-full z-10 mb-1 hidden whitespace-nowrap rounded bg-stone-900 px-2 py-1 text-xs text-white group-hover:block">
                  {d.label}: {format(d.value)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-1 flex gap-1 sm:gap-2">
        {data.map((d) => (
          <span key={d.label} className="flex-1 truncate text-center text-[11px] text-stone-500">
            {d.label}
          </span>
        ))}
      </div>
      <TableView data={data} format={format} />
    </div>
  );
}

// Batang mendatar untuk perbandingan antar kategori, diurutkan dari yang terbesar.
export function BarList({ data, format = String, empty = "Belum ada data." }: { data: Point[]; format?: (v: number) => string; empty?: string }) {
  const rows = [...data].filter((d) => d.value > 0).sort((a, b) => b.value - a.value);
  if (rows.length === 0) return <p className="text-sm text-stone-500">{empty}</p>;
  const max = rows[0].value;
  return (
    <ul className="space-y-2.5">
      {rows.map((d) => (
        <li key={d.label} className="text-sm" title={`${d.label}: ${format(d.value)}`}>
          <div className="mb-1 flex justify-between gap-3">
            <span className="truncate text-stone-700">{d.label}</span>
            <span className="shrink-0 font-medium tabular-nums text-stone-900">{format(d.value)}</span>
          </div>
          <div className="h-2 rounded-full bg-stone-100">
            <div className="h-2 rounded-full" style={{ width: `${Math.max(2, (d.value / max) * 100)}%`, background: chartColor }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
