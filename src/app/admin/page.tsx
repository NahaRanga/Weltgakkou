import Link from "next/link";
import { ColumnChart } from "@/components/admin/charts";
import { Badge, Card, Empty, PageTitle, Stat, WaLink } from "@/components/admin/ui";
import { requireDb, requireStaff, type CurrentUser } from "@/lib/auth";
import { formatDateTime, requestTime } from "@/lib/format";
import { formatRupiah } from "@/lib/programs";

export const metadata = { title: "Dashboard" };

// Awal bulan berjalan menurut WIB, dalam ISO UTC.
function monthStartIso(offsetMonths = 0) {
  const now = new Date(requestTime() + 7 * 3600_000);
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offsetMonths, 1) - 7 * 3600_000);
  return d.toISOString();
}

function todayRangeIso() {
  const now = new Date(requestTime() + 7 * 3600_000);
  const start = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - 7 * 3600_000;
  return [new Date(start).toISOString(), new Date(start + 86400_000).toISOString()];
}

type BatchRow = { id: string; name: string; status: string; quota: number; start_date: string; programs: { name: string }; enrollments: { status: string }[] };
type SessionRow = { id: string; number: number; starts_at: string; kind: string; topic: string | null; batches: { id: string; name: string; programs: { name: string } } };
type RecentRow = { id: string; status: string; created_at: string; profiles: { full_name: string; whatsapp: string | null }; batches: { id: string; name: string; programs: { name: string } } };
type DueRow = { id: string; code: string; amount: number; due_at: string; installment_no: number; enrollments: { profiles: { full_name: string; whatsapp: string | null } } };

export default async function AdminOverview() {
  const user = await requireStaff();
  if (user.role !== "admin") return <TeacherDashboard user={user} />;
  const db = requireDb();
  const [start, end] = todayRangeIso();
  const in3days = new Date(requestTime() + 3 * 86400_000).toISOString();

  const [paidRes, activeRes, waitingRes, proofsRes, leadsRes, batchesRes, todayRes, recentRes, dueRes] = await Promise.all([
    db.from("invoices").select("amount, paid_at").eq("status", "lunas").gte("paid_at", monthStartIso(-5)),
    db.from("enrollments").select("id", { count: "exact", head: true }).eq("status", "aktif").eq("is_test", false),
    db.from("enrollments").select("id", { count: "exact", head: true }).eq("status", "menunggu_bayar").eq("is_test", false),
    db.from("invoices").select("id", { count: "exact", head: true }).eq("status", "menunggu_verifikasi"),
    db.from("leads").select("id", { count: "exact", head: true }).eq("status", "baru"),
    db.from("batches").select("id, name, status, quota, start_date, programs(name), enrollments(status)").eq("enrollments.is_test", false).eq("mode", "live").neq("status", "selesai").order("start_date"),
    db.from("sessions").select("id, number, starts_at, kind, topic, batches!inner(id, name, status, programs(name))").gte("starts_at", start).lt("starts_at", end).neq("batches.status", "selesai").order("starts_at"),
    db.from("enrollments").select("id, status, created_at, profiles(full_name, whatsapp), batches(id, name, programs(name))").order("created_at", { ascending: false }).limit(6),
    db.from("invoices").select("id, code, amount, due_at, installment_no, enrollments(profiles(full_name, whatsapp))").eq("status", "belum").lte("due_at", in3days).order("due_at").limit(8),
  ]);

  const paid = paidRes.data ?? [];
  const thisMonth = monthStartIso(0);
  const incomeThisMonth = paid.filter((i) => i.paid_at >= thisMonth).reduce((s, i) => s + i.amount, 0);
  const months = Array.from({ length: 6 }, (_, k) => {
    const from = monthStartIso(k - 5);
    const to = monthStartIso(k - 4);
    const label = new Intl.DateTimeFormat("id-ID", { month: "short", year: "2-digit", timeZone: "Asia/Jakarta" }).format(new Date(from));
    return { label, total: paid.filter((i) => i.paid_at >= from && i.paid_at < to).reduce((s, i) => s + i.amount, 0) };
  });

  const batches = (batchesRes.data ?? []) as unknown as BatchRow[];
  const today = (todayRes.data ?? []) as unknown as SessionRow[];
  const recent = (recentRes.data ?? []) as unknown as RecentRow[];
  const due = (dueRes.data ?? []) as unknown as DueRow[];

  return (
    <>
      <PageTitle title="Dashboard" subtitle={`Halo ${user.fullName.split(" ")[0]}, ini keadaan Weltgakko hari ini.`} />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Stat label="Bukti bayar dicek" value={proofsRes.count ?? 0} href="/admin/pembayaran" tone="alert" />
        <Stat label="Waiting list baru" value={leadsRes.count ?? 0} href="/admin/waiting-list?status=baru" tone="alert" />
        <Stat label="Siswa aktif" value={activeRes.count ?? 0} href="/admin/siswa" />
        <Stat label="Menunggu bayar" value={waitingRes.count ?? 0} href="/admin/pembayaran?status=belum" />
        <Stat label="Pemasukan bulan ini" value={formatRupiah(incomeThisMonth)} href="/admin/pembayaran?status=lunas" />
        <Stat label="Batch aktif" value={batches.length} href="/admin/batch" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card title="Kelas hari ini" count={today.length}>
          {today.length === 0 ? (
            <Empty>Tidak ada kelas atau ujian hari ini.</Empty>
          ) : (
            <ul className="divide-y divide-stone-100">
              {today.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span>
                    <span className="font-medium text-stone-900">{new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" }).format(new Date(s.starts_at))}</span>{" "}
                    {s.batches.programs.name} · {s.batches.name} · {s.kind === "ujian" ? "Ujian" : `Kelas ${s.number}`}
                    {s.topic ? ` · ${s.topic}` : ""}
                  </span>
                  <Link href={`/admin/batch/${s.batches.id}#sesi-${s.id}`} className="shrink-0 font-medium text-red-700 hover:underline">
                    Absensi
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Isi batch">
          {batches.length === 0 ? (
            <Empty>
              Belum ada batch.{" "}
              <Link href="/admin/batch#buat" className="font-medium text-red-700 underline">
                Buat batch pertama
              </Link>
            </Empty>
          ) : (
            <ul className="space-y-3">
              {batches.map((b) => {
                const active = b.enrollments.filter((e) => e.status === "aktif").length;
                const waiting = b.enrollments.filter((e) => e.status === "menunggu_bayar").length;
                const pct = Math.min(100, Math.round(((active + waiting) / b.quota) * 100));
                return (
                  <li key={b.id}>
                    <Link href={`/admin/batch/${b.id}`} className="block text-sm hover:underline">
                      <span className="font-medium text-stone-900">
                        {b.programs.name} · {b.name}
                      </span>{" "}
                      <Badge value={b.status} />
                    </Link>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-stone-100">
                      <div className="h-full rounded-full bg-emerald-600" style={{ width: `${Math.round((active / b.quota) * 100)}%` }} />
                    </div>
                    <p className="mt-1 text-xs text-stone-500">
                      {active} aktif, {waiting} menunggu bayar dari kuota {b.quota} ({pct}% terisi)
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card title="Pendaftar terbaru">
          {recent.length === 0 ? (
            <Empty>Belum ada pendaftar.</Empty>
          ) : (
            <ul className="divide-y divide-stone-100">
              {recent.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span>
                    <span className="font-medium text-stone-900">{r.profiles.full_name}</span> <WaLink number={r.profiles.whatsapp} />
                    <span className="block text-xs text-stone-500">
                      {r.batches.programs.name} · {r.batches.name} · {formatDateTime(r.created_at)}
                    </span>
                  </span>
                  <Badge value={r.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Tagihan jatuh tempo (3 hari)" count={due.length}>
          {due.length === 0 ? (
            <Empty>Tidak ada tagihan yang segera jatuh tempo.</Empty>
          ) : (
            <ul className="divide-y divide-stone-100">
              {due.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span>
                    <span className="font-medium text-stone-900">{d.enrollments.profiles.full_name}</span>{" "}
                    <WaLink
                      number={d.enrollments.profiles.whatsapp}
                      text={`Halo ${d.enrollments.profiles.full_name}, mengingatkan tagihan Weltgakko ${d.code} sebesar ${formatRupiah(d.amount)} jatuh tempo ${formatDateTime(d.due_at)}. Terima kasih!`}
                    />
                    <span className="block text-xs text-stone-500">
                      {d.code} · {d.installment_no > 1 ? `cicilan ke-${d.installment_no} · ` : ""}jatuh tempo {formatDateTime(d.due_at)}
                    </span>
                  </span>
                  <span className="shrink-0 font-medium">{formatRupiah(d.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Pemasukan 6 bulan terakhir" className="xl:col-span-2">
          <ColumnChart data={months.map((m) => ({ label: m.label, value: m.total }))} format={(v) => formatRupiah(v)} />
        </Card>
      </div>
    </>
  );
}

// Dashboard pengajar: hanya batch yang ia ajar.
async function TeacherDashboard({ user }: { user: CurrentUser }) {
  const db = requireDb();
  const in7days = new Date(requestTime() + 7 * 86400_000).toISOString();
  const [batchesRes, upcomingRes] = await Promise.all([
    db.from("batches").select("id, name, status, quota, start_date, programs(name), enrollments(status)").eq("enrollments.is_test", false).eq("mode", "live").eq("teacher_id", user.id).neq("status", "selesai").order("start_date"),
    db
      .from("sessions")
      .select("id, number, starts_at, kind, topic, batches!inner(id, name, teacher_id, programs(name))")
      .eq("batches.teacher_id", user.id)
      .gte("starts_at", new Date(requestTime() - 2 * 3600_000).toISOString())
      .lt("starts_at", in7days)
      .order("starts_at"),
  ]);
  const batches = (batchesRes.data ?? []) as unknown as BatchRow[];
  const upcoming = (upcomingRes.data ?? []) as unknown as SessionRow[];

  return (
    <>
      <PageTitle title="Dashboard" subtitle={`Halo ${user.fullName.split(" ")[0]}, ini kelas kamu minggu ini.`} />
      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="Kelas 7 hari ke depan" count={upcoming.length}>
          {upcoming.length === 0 ? (
            <Empty>Tidak ada kelas dalam 7 hari ke depan.</Empty>
          ) : (
            <ul className="divide-y divide-stone-100">
              {upcoming.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span>
                    <span className="font-medium text-stone-900">{formatDateTime(s.starts_at)}</span>
                    <span className="block text-xs text-stone-500">
                      {s.batches.programs.name} · {s.batches.name} · {s.kind === "ujian" ? "Ujian" : `Kelas ${s.number}`}
                      {s.topic ? ` · ${s.topic}` : ""}
                    </span>
                  </span>
                  <Link href={`/admin/batch/${s.batches.id}#sesi-${s.id}`} className="shrink-0 font-medium text-red-700 hover:underline">
                    Absensi
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Kelas saya" count={batches.length}>
          {batches.length === 0 ? (
            <Empty>Belum ada batch yang ditugaskan ke kamu. Hubungi admin.</Empty>
          ) : (
            <ul className="divide-y divide-stone-100">
              {batches.map((b) => (
                <li key={b.id} className="py-2 text-sm">
                  <Link href={`/admin/batch/${b.id}`} className="font-medium text-stone-900 hover:underline">
                    {b.programs.name} · {b.name}
                  </Link>{" "}
                  <Badge value={b.status} />
                  <span className="block text-xs text-stone-500">{b.enrollments.filter((e) => e.status === "aktif").length} siswa aktif</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
