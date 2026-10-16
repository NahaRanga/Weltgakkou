import Link from "next/link";
import type { ReactNode } from "react";

// Kalender bulanan bersama untuk jadwal admin/pengajar dan area belajar siswa. Semua tanggal dihitung dalam WIB.
export const WIB = 7 * 3600_000;
const dayNames = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
const pad = (n: number) => String(n).padStart(2, "0");
const monthKey = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;

export const timeLabel = (iso: string) =>
  new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" }).format(new Date(iso));

export type CalendarMonth = { year: number; month: number; start: number; end: number; isThisMonth: boolean; today: number };

// Membaca ?bulan=YYYY-MM, default bulan ini (WIB). start/end adalah batas bulan dalam epoch ms.
export function resolveMonth(param: string | string[] | undefined, now: number): CalendarMonth {
  const nowWib = new Date(now + WIB);
  const match = typeof param === "string" ? /^(\d{4})-(\d{2})$/.exec(param) : null;
  const year = match ? Number(match[1]) : nowWib.getUTCFullYear();
  const month = match ? Number(match[2]) - 1 : nowWib.getUTCMonth();
  const isThisMonth = year === nowWib.getUTCFullYear() && month === nowWib.getUTCMonth();
  return {
    year,
    month,
    start: Date.UTC(year, month, 1) - WIB,
    end: Date.UTC(year, month + 1, 1) - WIB,
    isThisMonth,
    today: isThisMonth ? nowWib.getUTCDate() : -1,
  };
}

export function monthTitle({ year, month }: CalendarMonth) {
  const t = new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(year, month, 1)));
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export function MonthNav({ cal, path, buttonClass }: { cal: CalendarMonth; path: string; buttonClass: string }) {
  const prev = new Date(Date.UTC(cal.year, cal.month - 1, 1));
  const next = new Date(Date.UTC(cal.year, cal.month + 1, 1));
  return (
    <div className="flex items-center gap-2">
      <Link href={`${path}?bulan=${monthKey(prev)}`} className={buttonClass} scroll={false}>
        ← Sebelumnya
      </Link>
      {!cal.isThisMonth && (
        <Link href={path} className={buttonClass} scroll={false}>
          Bulan ini
        </Link>
      )}
      <Link href={`${path}?bulan=${monthKey(next)}`} className={buttonClass} scroll={false}>
        Berikutnya →
      </Link>
    </div>
  );
}

export function MonthCalendar<T extends { id: string; starts_at: string }>({
  cal,
  items,
  renderItem,
  renderMobileItem = renderItem,
  maxPerDay = 4,
}: {
  cal: CalendarMonth;
  items: T[];
  renderItem: (item: T) => ReactNode;
  renderMobileItem?: (item: T) => ReactNode;
  maxPerDay?: number;
}) {
  const { year, month, today } = cal;
  const byDay = new Map<number, T[]>();
  for (const s of items) {
    const day = new Date(new Date(s.starts_at).getTime() + WIB).getUTCDate();
    byDay.set(day, [...(byDay.get(day) ?? []), s]);
  }
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const firstWeekday = (new Date(Date.UTC(year, month, 1)).getUTCDay() + 6) % 7; // Senin = 0
  const cells: (number | null)[] = [...Array(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);

  return (
    <>
      {/* Kalender bulan untuk layar lebar */}
      <div className="hidden md:block">
        <div className="grid grid-cols-7 border-l border-t border-stone-200 text-xs">
          {dayNames.map((d) => (
            <div key={d} className="border-b border-r border-stone-200 bg-stone-50 px-2 py-1.5 font-medium text-stone-500">
              {d}
            </div>
          ))}
          {cells.map((day, i) => {
            const dayItems = day ? (byDay.get(day) ?? []) : [];
            return (
              <div key={i} className={`min-h-24 border-b border-r border-stone-200 p-1 ${day ? "" : "bg-stone-50/60"}`}>
                {day && (
                  <>
                    <p className={`mb-0.5 px-1 text-xs ${day === today ? "inline-block rounded-full bg-red-700 px-1.5 font-semibold text-white" : "text-stone-500"}`}>{day}</p>
                    <div className="space-y-0.5">
                      {dayItems.slice(0, maxPerDay).map((s) => (
                        <div key={s.id}>{renderItem(s)}</div>
                      ))}
                      {dayItems.length > maxPerDay && <p className="px-1 text-xs text-stone-500">+{dayItems.length - maxPerDay} lagi</p>}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
        {items.length === 0 && <p className="mt-4 text-sm text-stone-500">Tidak ada sesi bulan ini.</p>}
      </div>

      {/* Daftar per hari untuk HP */}
      <div className="space-y-4 md:hidden">
        {byDay.size === 0 && <p className="text-sm text-stone-500">Tidak ada sesi bulan ini.</p>}
        {[...byDay.entries()].map(([day, dayItems]) => (
          <div key={day}>
            <p className={`text-sm font-semibold ${day === today ? "text-red-700" : "text-stone-900"}`}>
              {new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(year, month, day)))}
              {day === today ? " · hari ini" : ""}
            </p>
            <div className="mt-1 space-y-1">
              {dayItems.map((s) => (
                <div key={s.id}>{renderMobileItem(s)}</div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
