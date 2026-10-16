import Link from "next/link";
import { setReferralPaid } from "@/app/admin/actions";
import { InvoiceActions, VerifyButtons } from "@/components/admin-controls";
import { Badge, Card, Empty, FilterTabs, PageTitle, smallButton, tableClass, tdClass, thClass, WaLink } from "@/components/admin/ui";
import { inputClass } from "@/components/ui/form";
import { requireDb } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
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

type ReferralRow = {
  id: string;
  amount: number;
  percent: number;
  paid: boolean;
  profiles: { full_name: string; whatsapp: string | null };
  enrollments: { profiles: { full_name: string } };
};

const statuses = [
  { value: "", label: "Semua" },
  { value: "belum", label: "Belum bayar" },
  { value: "menunggu_verifikasi", label: "Cek bukti" },
  { value: "lunas", label: "Lunas" },
  { value: "ditolak", label: "Ditolak" },
  { value: "kedaluwarsa", label: "Kedaluwarsa" },
];

export default async function PaymentsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const status = typeof sp.status === "string" && statuses.some((s) => s.value === sp.status) ? sp.status : "";
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const db = requireDb();

  let invoiceQuery = db
    .from("invoices")
    .select("id, code, amount, status, installment_no, due_at, paid_at, created_at, enrollments!inner(profile_id, profiles!inner(full_name, whatsapp), batches(id, name, programs(name)))")
    .order("created_at", { ascending: false })
    .limit(100);
  if (status) invoiceQuery = invoiceQuery.eq("status", status);
  if (q) {
    const term = q.replace(/[%,()]/g, " ");
    invoiceQuery = /^WG/i.test(term) ? invoiceQuery.ilike("code", `${term}%`) : invoiceQuery.ilike("enrollments.profiles.full_name", `%${term}%`);
  }

  const [pendingRes, invoicesRes, referralsRes] = await Promise.all([
    db
      .from("invoices")
      .select("id, code, amount, unique_code, installment_no, method, enrollments(profiles(full_name, whatsapp), batches(name, programs(name))), payment_proofs(file_path, uploaded_at)")
      .eq("status", "menunggu_verifikasi")
      .order("created_at"),
    invoiceQuery,
    db.from("referrals").select("id, amount, percent, paid, profiles(full_name, whatsapp), enrollments(profiles(full_name))").order("paid").limit(50),
  ]);

  const pending = (pendingRes.data ?? []) as unknown as PendingInvoice[];
  const invoices = (invoicesRes.data ?? []) as unknown as InvoiceRow[];
  const referrals = (referralsRes.data ?? []) as unknown as ReferralRow[];
  const unpaidReferral = referrals.filter((r) => !r.paid).reduce((s, r) => s + r.amount, 0);

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
    <>
      <PageTitle title="Pembayaran" subtitle="Cek bukti transfer, pantau tagihan, dan komisi referral." />

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

      <Card title="Semua tagihan" className="mt-6">
        <FilterTabs base="/admin/pembayaran" param="status" current={status} options={statuses} />
        <form className="mb-4 flex gap-2">
          {status && <input type="hidden" name="status" value={status} />}
          <input name="q" defaultValue={q} placeholder="Cari nama siswa atau kode tagihan (WG...)" className={`${inputClass} max-w-md`} />
          <button className={smallButton}>Cari</button>
        </form>
        {invoices.length === 0 ? (
          <Empty>Tidak ada tagihan.</Empty>
        ) : (
          <div className="-mx-5 overflow-x-auto">
            <table className={tableClass}>
              <thead className="bg-stone-50">
                <tr>
                  <th className={thClass}>Siswa</th>
                  <th className={thClass}>Kelas</th>
                  <th className={thClass}>Nominal</th>
                  <th className={thClass}>Status</th>
                  <th className={thClass}>Tanggal</th>
                  <th className={thClass}></th>
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
                    <td className={tdClass}>{(i.status === "belum" || i.status === "ditolak") && <InvoiceActions invoiceId={i.id} />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {invoices.length === 100 && <p className="mt-3 text-xs text-stone-500">Menampilkan 100 tagihan terbaru. Pakai filter atau pencarian untuk yang lebih lama.</p>}
      </Card>

      <Card title="Komisi referral" className="mt-6" action={<span className="text-sm text-stone-600">Belum dibayar: {formatRupiah(unpaidReferral)}</span>}>
        {referrals.length === 0 ? (
          <Empty>Belum ada komisi referral. Komisi tercatat otomatis saat siswa yang memakai kode referral membayar tagihan pertama.</Empty>
        ) : (
          <div className="-mx-5 overflow-x-auto">
            <table className={tableClass}>
              <thead className="bg-stone-50">
                <tr>
                  <th className={thClass}>Pemberi referral</th>
                  <th className={thClass}>Siswa baru</th>
                  <th className={thClass}>Komisi</th>
                  <th className={thClass}></th>
                </tr>
              </thead>
              <tbody>
                {referrals.map((r) => (
                  <tr key={r.id} className="border-t border-stone-100">
                    <td className={tdClass}>
                      {r.profiles.full_name} <WaLink number={r.profiles.whatsapp} />
                    </td>
                    <td className={tdClass}>{r.enrollments.profiles.full_name}</td>
                    <td className={`${tdClass} tabular-nums`}>
                      {formatRupiah(r.amount)} <span className="text-xs text-stone-500">({r.percent}%)</span>
                    </td>
                    <td className={tdClass}>
                      <form action={setReferralPaid.bind(null, r.id, !r.paid)}>
                        <button className={r.paid ? "text-xs text-stone-500 hover:underline" : smallButton}>{r.paid ? "Sudah dibayar (batalkan)" : "Tandai sudah dibayar"}</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
