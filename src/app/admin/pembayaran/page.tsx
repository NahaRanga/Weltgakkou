import Link from "next/link";
import { InvoiceActions, VerifyButtons } from "@/components/admin-controls";
import { ColumnChart } from "@/components/admin/charts";
import { Badge, Card, Empty, FilterTabs, PageTitle, smallButton, Stat, tableClass, tdClass, thClass, WaLink } from "@/components/admin/ui";
import { inputClass } from "@/components/ui/form";
import { requireAdmin, requireDb } from "@/lib/auth";
import { formatDateTime, requestTime } from "@/lib/format";
import { formatRupiah } from "@/lib/programs";

export const metadata = { title: "Pembayaran" };

type PendingInvoice = {
  id: string;
  code: string;
  amount: number;
  unique_code: number;
  installment_no: number;
  method: string | null;
  enrollments: { profiles: { full_name: string; whatsapp: string | null }; batches: { name: string; programs: { name: string } } };
  payment_proofs: { file_path: string; uploaded_at: string }[];
};

type InvoiceRow = {
  id: string;
  code: string;
  amount: number;
  status: string;
  installment_no: number;
  due_at: string;
  paid_at: string | null;
  created_at: string;
  enrollments: { profile_id: string; profiles: { full_name: string; whatsapp: string | null }; batches: { id: string; name: string; programs: { name: string } } };
};

const tabs = [
  { value: "verifikasi", label: "Menunggu verifikasi" },
  { value: "tagihan", label: "Tagihan" },
  { value: "riwayat", label: "Riwayat & pemasukan" },
];

const statuses = [
  { value: "", label: "Semua" },
  { value: "belum", label: "Belum bayar" },
  { value: "menunggu_verifikasi", label: "Cek bukti" },
  { value: "lunas", label: "Lunas" },
  { value: "ditolak", label: "Ditolak" },
  { value: "kedaluwarsa", label: "Kedaluwarsa" },
];

const invoiceColumns =
  "id, code, amount, status, installment_no, due_at, paid_at, created_at, enrollments!inner(profile_id, profiles!inner(full_name, whatsapp), batches(id, name, programs(name)))";

// Awal bulan menurut WIB, mundur `back` bulan dari bulan ini.
function monthStart(back: number) {
  const now = new Date(requestTime() + 7 * 3600_000);
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - back, 1) - 7 * 3600_000;
}

export default async function PaymentsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin();
  const sp = await searchParams;
  const db = requireDb();

  const pendingRes = await db
    .from("invoices")
    .select("id, code, amount, unique_code, installment_no, method, enrollments(profiles(full_name, whatsapp), batches(name, programs(name))), payment_proofs(file_path, uploaded_at)")
    .eq("status", "menunggu_verifikasi")
    .order("created_at");
  const pending = (pendingRes.data ?? []) as unknown as PendingInvoice[];
  const tab = tabs.some((t) => t.value === sp.tab) ? (sp.tab as string) : pending.length ? "verifikasi" : "tagihan";

  return (
    <>
      <PageTitle title="Pembayaran" subtitle="Cek bukti transfer, pantau tagihan, dan lihat pemasukan." />
      <nav className="mb-6 flex gap-1 overflow-x-auto border-b border-stone-200">
        {tabs.map((t) => (
          <Link
            key={t.value}
            href={`/admin/pembayaran?tab=${t.value}`}
            className={`-mb-px whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium ${tab === t.value ? "border-red-700 text-stone-900" : "border-transparent text-stone-500 hover:text-stone-800"}`}
          >
            {t.label}
            {t.value === "verifikasi" && pending.length > 0 && <span className="ml-1.5 rounded-full bg-red-700 px-1.5 text-xs text-white">{pending.length}</span>}
          </Link>
        ))}
      </nav>
      {tab === "verifikasi" && <VerifyTab pending={pending} />}
      {tab === "tagihan" && <InvoicesTab sp={sp} />}
      {tab === "riwayat" && <HistoryTab />}
    </>
  );
}

async function VerifyTab({ pending }: { pending: PendingInvoice[] }) {
  const db = requireDb();
  // Link foto bukti berlaku 1 jam (bucket privat).
  const proofUrls = new Map<string, string>();
  await Promise.all(
    pending.map(async (inv) => {
      const latest = [...inv.payment_proofs].sort((a, b) => b.uploaded_at.localeCompare(a.uploaded_at))[0];
      if (!latest) return;
      const { data } = await db.storage.from("payment-proofs").createSignedUrl(latest.file_path, 3600);
      if (data) proofUrls.set(inv.id, data.signedUrl);
    }),
  );

  return (
    <Card title="Bukti bayar perlu dicek" count={pending.length}>
      {pending.length === 0 ? (
        <Empty>Tidak ada bukti bayar yang menunggu.</Empty>
      ) : (
        <div className="space-y-4">
          {pending.map((inv) => (
            <div key={inv.id} className="grid gap-4 rounded-lg border border-stone-200 p-4 sm:grid-cols-[1fr_200px]">
              <div className="space-y-2">
                <p className="font-semibold text-stone-900">
                  {inv.enrollments.profiles.full_name} <WaLink number={inv.enrollments.profiles.whatsapp} />
                </p>
                <p className="text-sm text-stone-600">
                  {inv.enrollments.batches.programs.name} · {inv.enrollments.batches.name}
                  {inv.installment_no > 1 ? ` · cicilan ke-${inv.installment_no}` : ""}
                </p>
                <p className="text-2xl font-bold text-stone-900">{formatRupiah(inv.amount)}</p>
                <p className="text-sm text-stone-600">
                  Kode unik {inv.unique_code} · {inv.method === "qris" ? "QRIS" : "Transfer"} · tagihan {inv.code}
                </p>
                <VerifyButtons invoiceId={inv.id} />
              </div>
              {proofUrls.get(inv.id) && (
                <a href={proofUrls.get(inv.id)} target="_blank" rel="noreferrer" className="block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={proofUrls.get(inv.id)} alt="Bukti bayar" className="max-h-64 w-full rounded-lg border object-contain" />
                  <span className="text-xs text-stone-500">Buka ukuran penuh</span>
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function InvoiceTable({ invoices, actions }: { invoices: InvoiceRow[]; actions: boolean }) {
  if (invoices.length === 0) return <Empty>Tidak ada tagihan.</Empty>;
  return (
    <div className="-mx-5 overflow-x-auto">
      <table className={tableClass}>
        <thead className="bg-stone-50">
          <tr>
            <th className={thClass}>Siswa</th>
            <th className={thClass}>Kelas</th>
            <th className={thClass}>Nominal</th>
            <th className={thClass}>Status</th>
            <th className={thClass}>Tanggal</th>
            {actions && <th className={thClass}></th>}
          </tr>
        </thead>
        <tbody>
          {invoices.map((i) => (
            <tr key={i.id} className="border-t border-stone-100">
              <td className={tdClass}>
                <Link href={`/admin/siswa/${i.enrollments.profile_id}`} className="font-medium text-stone-900 hover:underline">
                  {i.enrollments.profiles.full_name}
                </Link>{" "}
                <WaLink number={i.enrollments.profiles.whatsapp} />
                <span className="block font-mono text-xs text-stone-500">{i.code}</span>
              </td>
              <td className={tdClass}>
                <Link href={`/admin/batch/${i.enrollments.batches.id}`} className="hover:underline">
                  {i.enrollments.batches.programs.name}
                </Link>
                <span className="block text-xs text-stone-500">
                  {i.enrollments.batches.name}
                  {i.installment_no > 1 ? ` · cicilan ke-${i.installment_no}` : ""}
                </span>
              </td>
              <td className={`${tdClass} whitespace-nowrap tabular-nums`}>{formatRupiah(i.amount)}</td>
              <td className={tdClass}>
                <Badge value={i.status} />
              </td>
              <td className={`${tdClass} text-xs text-stone-600`}>
                {i.status === "lunas" && i.paid_at ? `Lunas ${formatDateTime(i.paid_at)}` : `Jatuh tempo ${formatDateTime(i.due_at)}`}
              </td>
              {actions && <td className={tdClass}>{(i.status === "belum" || i.status === "ditolak") && <InvoiceActions invoiceId={i.id} />}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

async function InvoicesTab({ sp }: { sp: Record<string, string | string[] | undefined> }) {
  const status = typeof sp.status === "string" && statuses.some((s) => s.value === sp.status) ? sp.status : "";
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  let query = requireDb().from("invoices").select(invoiceColumns).order("created_at", { ascending: false }).limit(100);
  if (status) query = query.eq("status", status);
  if (q) {
    const term = q.replace(/[%,()]/g, " ");
    query = /^WG/i.test(term) ? query.ilike("code", `${term}%`) : query.ilike("enrollments.profiles.full_name", `%${term}%`);
  }
  const invoices = ((await query).data ?? []) as unknown as InvoiceRow[];

  return (
    <Card title="Semua tagihan">
      <FilterTabs base="/admin/pembayaran?tab=tagihan" param="status" current={status} options={statuses} />
      <form className="mb-4 flex gap-2">
        <input type="hidden" name="tab" value="tagihan" />
        {status && <input type="hidden" name="status" value={status} />}
        <input name="q" defaultValue={q} placeholder="Cari nama siswa atau kode tagihan (WG...)" className={`${inputClass} max-w-md`} />
        <button className={smallButton}>Cari</button>
      </form>
      <InvoiceTable invoices={invoices} actions />
      {invoices.length === 100 && <p className="mt-3 text-xs text-stone-500">Menampilkan 100 tagihan terbaru. Pakai filter atau pencarian untuk yang lebih lama.</p>}
    </Card>
  );
}

async function HistoryTab() {
  const db = requireDb();
  const since = new Date(monthStart(11)).toISOString();
  const [paidRes, recentRes] = await Promise.all([
    db.from("invoices").select("amount, paid_at").eq("status", "lunas").gte("paid_at", since),
    db.from("invoices").select(invoiceColumns).eq("status", "lunas").order("paid_at", { ascending: false }).limit(50),
  ]);
  const paid = paidRes.data ?? [];
  const months = Array.from({ length: 12 }, (_, k) => {
    const from = monthStart(11 - k);
    const to = monthStart(10 - k);
    const label = new Intl.DateTimeFormat("id-ID", { month: "short", timeZone: "Asia/Jakarta" }).format(new Date(from));
    const value = paid.filter((i) => {
      const t = new Date(i.paid_at).getTime();
      return t >= from && t < to;
    }).reduce((s, i) => s + i.amount, 0);
    return { label, value };
  });
  const thisMonth = months[11].value;
  const lastMonth = months[10].value;
  const total = months.reduce((s, m) => s + m.value, 0);

  return (
    <>
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat label="Pemasukan bulan ini" value={formatRupiah(thisMonth)} tone="hijau" />
        <Stat label="Bulan lalu" value={formatRupiah(lastMonth)} tone="biru" />
        <Stat label="12 bulan terakhir" value={formatRupiah(total)} tone="ungu" />
      </div>
      <Card title="Pemasukan per bulan">
        <ColumnChart data={months} format={(v) => formatRupiah(v)} />
      </Card>
      <Card title="Pembayaran lunas terbaru" className="mt-6">
        <InvoiceTable invoices={(recentRes.data ?? []) as unknown as InvoiceRow[]} actions={false} />
      </Card>
    </>
  );
}
