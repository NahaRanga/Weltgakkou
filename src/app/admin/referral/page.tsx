import Link from "next/link";
import { setReferralPaid } from "@/app/admin/referral/actions";
import { BarList } from "@/components/admin/charts";
import { Card, Empty, PageTitle, smallButton, Stat, tableClass, tdClass, thClass, WaLink } from "@/components/admin/ui";
import { requireAdmin, requireDb } from "@/lib/auth";
import { formatRupiah } from "@/lib/programs";

export const metadata = { title: "Referral" };

type ReferralRow = {
  id: string;
  amount: number;
  percent: number;
  paid: boolean;
  referrer_id: string;
  profiles: { full_name: string; whatsapp: string | null; referral_code: string | null };
  enrollments: { profiles: { full_name: string }; batches: { name: string; programs: { name: string } } };
};

export default async function ReferralPage() {
  await requireAdmin();
  const db = requireDb();
  const [referralsRes, usedRes] = await Promise.all([
    db
      .from("referrals")
      .select("id, amount, percent, paid, referrer_id, profiles(full_name, whatsapp, referral_code), enrollments(profiles(full_name), batches(name, programs(name)))")
      .order("paid")
      .limit(200),
    db.from("enrollments").select("referral_code, status").not("referral_code", "is", null),
  ]);
  const referrals = (referralsRes.data ?? []) as unknown as ReferralRow[];
  const used = usedRes.data ?? [];
  const unpaid = referrals.filter((r) => !r.paid).reduce((s, r) => s + r.amount, 0);
  const total = referrals.reduce((s, r) => s + r.amount, 0);

  const byReferrer = new Map<string, { label: string; value: number }>();
  for (const r of referrals) {
    const cur = byReferrer.get(r.referrer_id) ?? { label: r.profiles.full_name, value: 0 };
    cur.value += 1;
    byReferrer.set(r.referrer_id, cur);
  }
  const codeCounts = new Map<string, number>();
  for (const e of used) codeCounts.set(e.referral_code as string, (codeCounts.get(e.referral_code as string) ?? 0) + 1);

  return (
    <>
      <PageTitle title="Referral" subtitle={`Siswa yang membawa teman dapat komisi ${process.env.REFERRAL_PERCENT ?? 10}% dari pembayaran pertama temannya.`} />
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat label="Pendaftar pakai kode" value={used.length} />
        <Stat label="Total komisi" value={formatRupiah(total)} />
        <Stat label="Komisi belum dibayar" value={formatRupiah(unpaid)} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="Pemberi referral teratas">
          <BarList data={[...byReferrer.values()]} format={(v) => `${v} siswa`} empty="Belum ada referral yang menghasilkan siswa." />
        </Card>
        <Card title="Kode yang dipakai saat daftar">
          <BarList data={[...codeCounts.entries()].map(([label, value]) => ({ label, value }))} format={(v) => `${v}x`} empty="Belum ada pendaftar yang memakai kode." />
          <p className="mt-3 text-xs text-stone-500">Termasuk pendaftar yang belum bayar. Komisi baru tercatat setelah pembayaran pertama diterima.</p>
        </Card>
      </div>

      <Card title="Komisi" count={referrals.length} className="mt-6">
        {referrals.length === 0 ? (
          <Empty>Belum ada komisi referral.</Empty>
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
                      <Link href={`/admin/siswa/${r.referrer_id}`} className="font-medium text-stone-900 hover:underline">
                        {r.profiles.full_name}
                      </Link>{" "}
                      <WaLink number={r.profiles.whatsapp} />
                      <span className="block font-mono text-xs text-stone-500">{r.profiles.referral_code}</span>
                    </td>
                    <td className={tdClass}>
                      {r.enrollments.profiles.full_name}
                      <span className="block text-xs text-stone-500">
                        {r.enrollments.batches.programs.name} · {r.enrollments.batches.name}
                      </span>
                    </td>
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
