import Link from "next/link";
import { Card, PageTitle, seriesColors, smallButton, Stat } from "@/components/admin/ui";
import { requireDb, requireStaff } from "@/lib/auth";
import { requestTime } from "@/lib/format";

export const metadata = { title: "Jadwal" };

type SessionRow = {
  id: string;
  number: number;
  starts_at: string;
  kind: string;
  topic: string | null;
  batches: { id: string; name: string; program_id: string; programs: { name: string } };
};

const WIB = 7 * 3600_000;
const dayNames = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
const pad = (n: number) => String(n).padStart(2, "0");
const timeLabel = (iso: string) => new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" }).format(new Date(iso));

export default async function SchedulePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireStaff();
  const sp = await searchParams;
  const nowWib = new Date(requestTime() + WIB);
  const match = typeof sp.bulan === "string" ? /^(\d{4})-(\d{2})$/.exec(sp.bulan) : null;
  const year = match ? Number(match[1]) : nowWib.getUTCFullYear();
  const month = match ? Number(match[2]) - 1 : nowWib.getUTCMonth();

  const monthStart = Date.UTC(year, month, 1) - WIB;
  const monthEnd = Date.UTC(year, month + 1, 1) - WIB;
  const db = requireDb();

  let query = db
    .from("sessions")
    .select("id, number, starts_at, kind, topic, batches!inner(id, name, program_id, teacher_id, programs(name))")
    .gte("starts_at", new Date(monthStart).toISOString())
    .lt("starts_at", new Date(monthEnd).toISOString())
    .order("starts_at");
  if (user.role !== "admin") query = query.eq("batches.teacher_id", user.id);

  const [sessionsRes, programsRes] = await Promise.all([query, db.from("programs").select("id, name").order("created_at")]);
  const sessions = (sessionsRes.data ?? []) as unknown as SessionRow[];
  // Warna mengikuti program (urutan program tetap), bukan urutan tampil di bulan ini.
  const programs = programsRes.data ?? [];
  const colorOf = new Map(programs.map((p, i) => [p.id, seriesColors[i % seriesColors.length]]));
  const shown = programs.filter((p) => sessions.some((s) => s.batches.program_id === p.id));

  const byDay = new Map<number, SessionRow[]>();
  for (const s of sessions) {
    const day = new Date(new Date(s.starts_at).getTime() + WIB).getUTCDate();
    byDay.set(day, [...(byDay.get(day) ?? []), s]);
  }
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const firstWeekday = (new Date(Date.UTC(year, month, 1)).getUTCDay() + 6) % 7; // Senin = 0
  const cells: (number | null)[] = [...Array(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);

  const isThisMonth = year === nowWib.getUTCFullYear() && month === nowWib.getUTCMonth();
  const today = isThisMonth ? nowWib.getUTCDate() : -1;
  const prev = new Date(Date.UTC(year, month - 1, 1));
  const next = new Date(Date.UTC(year, month + 1, 1));
  const key = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
  const title = new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(year, month, 1)));
  const batchCount = new Set(sessions.map((s) => s.batches.id)).size;

  const event = (s: SessionRow) => (
    <Link
      key={s.id}
      href={`/admin/batch/${s.batches.id}#sesi-${s.id}`}
      title={`${s.batches.programs.name} · ${s.batches.name} · ${s.kind === "ujian" ? "Ujian" : `Kelas ${s.number}`}${s.topic ? ` · ${s.topic}` : ""}`}
      className="flex items-center gap-1.5 truncate rounded px-1 py-0.5 text-xs text-stone-800 hover:bg-stone-100"
    >
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: colorOf.get(s.batches.program_id) }} />
      <span className="tabular-nums text-stone-500">{timeLabel(s.starts_at)}</span>
      <span className="truncate">
        {s.kind === "ujian" ? "Ujian " : ""}
        {s.batches.programs.name}
      </span>
    </Link>
  );

  return (
    <>
      <PageTitle
        title="Jadwal"
        subtitle={user.role === "admin" ? "Semua sesi kelas dan ujian." : "Sesi kelas dan ujian yang kamu ajar."}
        action={
          <div className="flex items-center gap-2">
            <Link href={`/admin/jadwal?bulan=${key(prev)}`} className={smallButton}>
              ← Sebelumnya
            </Link>
            {!isThisMonth && (
              <Link href="/admin/jadwal" className={smallButton}>
                Bulan ini
              </Link>
            )}
            <Link href={`/admin/jadwal?bulan=${key(next)}`} className={smallButton}>
              Berikutnya →
            </Link>
          </div>
        }
      />

      <div className="mb-6 grid grid-cols-3 gap-3">
        <Stat label={`Sesi ${title}`} value={sessions.length} />
        <Stat label="Ujian" value={sessions.filter((s) => s.kind === "ujian").length} />
        <Stat label="Batch" value={batchCount} />
      </div>

      <Card title={title.charAt(0).toUpperCase() + title.slice(1)}>
        {shown.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-600">
            {shown.map((p) => (
              <span key={p.id} className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: colorOf.get(p.id) }} />
                {p.name}
              </span>
            ))}
          </div>
        )}

        {/* Kalender bulan untuk layar lebar */}
        <div className="hidden md:block">
          <div className="grid grid-cols-7 border-l border-t border-stone-200 text-xs">
            {dayNames.map((d) => (
              <div key={d} className="border-b border-r border-stone-200 bg-stone-50 px-2 py-1.5 font-medium text-stone-500">
                {d}
              </div>
            ))}
            {cells.map((day, i) => {
              const items = day ? (byDay.get(day) ?? []) : [];
              return (
                <div key={i} className={`min-h-24 border-b border-r border-stone-200 p-1 ${day ? "" : "bg-stone-50/60"}`}>
                  {day && (
                    <>
                      <p className={`mb-0.5 px-1 text-xs ${day === today ? "inline-block rounded-full bg-red-700 px-1.5 font-semibold text-white" : "text-stone-500"}`}>{day}</p>
                      <div className="space-y-0.5">
                        {items.slice(0, 4).map(event)}
                        {items.length > 4 && <p className="px-1 text-xs text-stone-500">+{items.length - 4} lagi</p>}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Daftar per hari untuk HP */}
        <div className="space-y-4 md:hidden">
          {[...byDay.entries()].length === 0 && <p className="text-sm text-stone-500">Tidak ada sesi bulan ini.</p>}
          {[...byDay.entries()].map(([day, items]) => (
            <div key={day}>
              <p className={`text-sm font-semibold ${day === today ? "text-red-700" : "text-stone-900"}`}>
                {new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(year, month, day)))}
              </p>
              <div className="mt-1 space-y-0.5">{items.map(event)}</div>
            </div>
          ))}
        </div>
        {sessions.length === 0 && <p className="mt-4 hidden text-sm text-stone-500 md:block">Tidak ada sesi bulan ini.</p>}
      </Card>
    </>
  );
}
