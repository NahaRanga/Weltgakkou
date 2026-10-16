import Link from "next/link";
import { Card, PageTitle, seriesColors, smallButton, Stat } from "@/components/admin/ui";
import { requireDb, requireStaff } from "@/lib/auth";
import { requestTime } from "@/lib/format";
import { MonthCalendar, MonthNav, monthTitle, resolveMonth, timeLabel } from "@/components/month-calendar";

export const metadata = { title: "Jadwal" };

type SessionRow = {
  id: string;
  number: number;
  starts_at: string;
  kind: string;
  topic: string | null;
  batches: { id: string; name: string; program_id: string; programs: { name: string } };
};

export default async function SchedulePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireStaff();
  const sp = await searchParams;
  const cal = resolveMonth(sp.bulan, requestTime());
  const db = requireDb();

  let query = db
    .from("sessions")
    .select("id, number, starts_at, kind, topic, batches!inner(id, name, program_id, teacher_id, programs(name))")
    .gte("starts_at", new Date(cal.start).toISOString())
    .lt("starts_at", new Date(cal.end).toISOString())
    .order("starts_at");
  if (user.role !== "admin") query = query.eq("batches.teacher_id", user.id);

  const [sessionsRes, programsRes] = await Promise.all([query, db.from("programs").select("id, name").order("created_at")]);
  const sessions = (sessionsRes.data ?? []) as unknown as SessionRow[];
  // Warna mengikuti program (urutan program tetap), bukan urutan tampil di bulan ini.
  const programs = programsRes.data ?? [];
  const colorOf = new Map(programs.map((p, i) => [p.id, seriesColors[i % seriesColors.length]]));
  const shown = programs.filter((p) => sessions.some((s) => s.batches.program_id === p.id));

  const title = monthTitle(cal);
  const batchCount = new Set(sessions.map((s) => s.batches.id)).size;

  const event = (s: SessionRow) => (
    <Link
      href={`/admin/batch/${s.batches.id}#sesi-${s.id}`}
      title={`${s.batches.programs.name} · ${s.batches.name} · ${s.kind === "ujian" ? "Ujian" : `Kelas ${s.number}`}${s.topic ? ` · ${s.topic}` : ""}`}
      className="flex items-center gap-1.5 truncate rounded px-1 py-0.5 text-xs text-stone-800 hover:bg-stone-100"
    >
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: colorOf.get(s.batches.program_id) }} />
      <span className="tabular-nums text-stone-500">{timeLabel(s.starts_at)}</span>
      <span className="truncate">
        {s.kind === "ujian" ? "Tes " : ""}
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
          <MonthNav cal={cal} path="/admin/jadwal" buttonClass={smallButton} />
        }
      />

      <div className="mb-6 grid grid-cols-3 gap-3">
        <Stat label={`Sesi ${title}`} value={sessions.length} />
        <Stat label="Ujian" value={sessions.filter((s) => s.kind === "ujian").length} />
        <Stat label="Batch" value={batchCount} />
      </div>

      <Card title={title}>
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

        <MonthCalendar cal={cal} items={sessions} renderItem={event} />
      </Card>
    </>
  );
}
