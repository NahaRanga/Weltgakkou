import { BarList, ColumnChart } from "@/components/admin/charts";
import { Card, PageTitle, smallButton, Stat } from "@/components/admin/ui";
import { inputClass } from "@/components/ui/form";
import { requireFinance, requireDb } from "@/lib/auth";
import { withBase } from "@/lib/base-path";
import { formatDate, requestTime } from "@/lib/format";
import { formatRupiah } from "@/lib/programs";
import { reportRange } from "@/lib/report-range";

export const metadata = { title: "Laporan" };

type EnrollmentRow = { created_at: string; status: string; batches: { programs: { name: string } } };

const sourceLabels: Record<string, string> = { tiktok: "TikTok", instagram: "Instagram", whatsapp: "WhatsApp", teman: "Teman", seminar: "Seminar" };

export default async function ReportPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireFinance();
  const range = reportRange(await searchParams, requestTime());
  const db = requireDb();

  const [enrollmentsRes, paidRes, leadsRes, referralsRes] = await Promise.all([
    db.from("enrollments").select("created_at, status, batches(programs(name))").gte("created_at", range.fromIso).lt("created_at", range.toIso),
    db.from("invoices").select("amount, paid_at").eq("status", "lunas").gte("paid_at", range.fromIso).lt("paid_at", range.toIso),
    db.from("leads").select("source, status").gte("created_at", range.fromIso).lt("created_at", range.toIso),
    db.from("referrals").select("profiles(full_name), enrollments!inner(created_at)").gte("enrollments.created_at", range.fromIso).lt("enrollments.created_at", range.toIso),
  ]);
  const enrollments = (enrollmentsRes.data ?? []) as unknown as EnrollmentRow[];
  const paid = paidRes.data ?? [];
  const leads = leadsRes.data ?? [];
  const referrals = (referralsRes.data ?? []) as unknown as { profiles: { full_name: string } }[];

  // Satu batang per bulan dalam rentang.
  const months: { key: string; label: string }[] = [];
  for (let d = new Date(`${range.from.slice(0, 7)}-01T00:00:00Z`); d.toISOString().slice(0, 10) <= range.to; d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1))) {
    months.push({ key: d.toISOString().slice(0, 7), label: new Intl.DateTimeFormat("id-ID", { month: "short", year: "2-digit", timeZone: "UTC" }).format(d) });
  }
  const monthOf = (iso: string) => new Date(new Date(iso).getTime() + 7 * 3600_000).toISOString().slice(0, 7);
  const perMonth = months.map((m) => ({ label: m.label, value: enrollments.filter((e) => monthOf(e.created_at) === m.key).length }));
  const incomePerMonth = months.map((m) => ({ label: m.label, value: paid.filter((p) => monthOf(p.paid_at) === m.key).reduce((s, p) => s + p.amount, 0) }));

  const count = <T,>(items: T[], keyOf: (x: T) => string) => {
    const map = new Map<string, number>();
    for (const x of items) map.set(keyOf(x), (map.get(keyOf(x)) ?? 0) + 1);
    return [...map.entries()].map(([label, value]) => ({ label, value }));
  };
  const income = paid.reduce((s, p) => s + p.amount, 0);
  const paying = enrollments.filter((e) => e.status === "aktif" || e.status === "selesai").length;
  const exportHref = withBase(`/admin/laporan/export?dari=${range.from}&sampai=${range.to}`);

  return (
    <>
      <PageTitle title="Laporan & statistik" subtitle={`${formatDate(range.from)} sampai ${formatDate(range.to)}`} />

      <form className="mb-6 flex flex-wrap items-end gap-3 rounded-xl border border-stone-200 bg-white p-4">
        <label className="text-sm">
          <span className="mb-1 block text-stone-600">Dari</span>
          <input type="date" name="dari" defaultValue={range.from} className={`${inputClass} py-1.5`} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-stone-600">Sampai</span>
          <input type="date" name="sampai" defaultValue={range.to} className={`${inputClass} py-1.5`} />
        </label>
        <button className={smallButton}>Terapkan</button>
        <a href={exportHref} className="ml-auto rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-800">
          Export CSV pendaftaran
        </a>
      </form>

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat label="Pendaftaran" value={enrollments.length} hint={`${paying} sudah bayar dan aktif`} />
        <Stat label="Pemasukan" value={formatRupiah(income)} />
        <Stat label="Waiting list masuk" value={leads.length} hint={`${leads.filter((l) => l.status === "daftar").length} sudah daftar kelas`} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="Pendaftaran per bulan">
          <ColumnChart data={perMonth} format={(v) => `${v} orang`} />
        </Card>
        <Card title="Pemasukan per bulan">
          <ColumnChart data={incomePerMonth} format={(v) => formatRupiah(v)} />
        </Card>
        <Card title="Program paling diminati">
          <BarList data={count(enrollments, (e) => e.batches.programs.name)} format={(v) => `${v} pendaftar`} />
        </Card>
        <Card title="Sumber waiting list">
          <BarList data={count(leads, (l) => sourceLabels[l.source ?? ""] ?? l.source ?? "Tidak diisi")} format={(v) => `${v} orang`} />
        </Card>
        <Card title="Referral teratas" className="xl:col-span-2">
          <BarList data={count(referrals, (r) => r.profiles.full_name)} format={(v) => `${v} siswa`} empty="Belum ada referral di rentang ini." />
        </Card>
      </div>
    </>
  );
}
