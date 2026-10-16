import Link from "next/link";
import { notFound } from "next/navigation";
import { InvoiceActions, PasswordLinkButton } from "@/components/admin-controls";
import { Badge, Card, Empty, PageTitle, tableClass, tdClass, thClass, WaLink } from "@/components/admin/ui";
import { participantColumns, participantRows, type ParticipantProfile } from "@/components/admin/participant";
import { requireDb } from "@/lib/auth";
import { withBase } from "@/lib/base-path";
import { formatDate, formatDateTime } from "@/lib/format";
import { formatRupiah } from "@/lib/programs";

export const metadata = { title: "Detail siswa" };

type Enrollment = {
  id: string;
  status: string;
  plan: string;
  referral_code: string | null;
  created_at: string;
  batches: { id: string; name: string; start_date: string; programs: { name: string } };
  invoices: { id: string; code: string; amount: number; status: string; installment_no: number; due_at: string; paid_at: string | null }[];
};

export default async function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const db = requireDb();

  const [profileRes, enrollmentsRes, attendanceRes, resultsRes] = await Promise.all([
    db.from("profiles").select(`id, role, referral_code, created_at, ${participantColumns}`).eq("id", id).maybeSingle(),
    db
      .from("enrollments")
      .select("id, status, plan, referral_code, created_at, batches(id, name, start_date, programs(name)), invoices(id, code, amount, status, installment_no, due_at, paid_at)")
      .eq("profile_id", id)
      .order("created_at", { ascending: false }),
    db.from("attendance").select("session_id", { count: "exact", head: true }).eq("profile_id", id),
    db.from("exam_results").select("score, exams(title, max_score)").eq("profile_id", id),
  ]);
  if (!profileRes.data) notFound();
  const profile = profileRes.data as unknown as ParticipantProfile & { id: string; role: string; referral_code: string | null; created_at: string };
  const enrollments = (enrollmentsRes.data ?? []) as unknown as Enrollment[];
  const results = (resultsRes.data ?? []) as unknown as { score: number; exams: { title: string; max_score: number } }[];
  const paidTotal = enrollments.flatMap((e) => e.invoices).filter((i) => i.status === "lunas").reduce((s, i) => s + i.amount, 0);

  return (
    <>
      <Link href="/admin/siswa" className="text-sm text-stone-600 hover:underline">
        ← Semua siswa
      </Link>
      <PageTitle
        title={profile.full_name}
        subtitle={`Terdaftar sejak ${formatDate(profile.created_at)} · total dibayar ${formatRupiah(paidTotal)}`}
        action={
          <div className="flex items-center gap-3">
            <Badge value={profile.role} />
            <WaLink number={profile.whatsapp} />
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Card title="Kelas" count={enrollments.length}>
            {enrollments.length === 0 ? (
              <Empty>Belum pernah mendaftar kelas.</Empty>
            ) : (
              <div className="space-y-5">
                {enrollments.map((e) => (
                  <div key={e.id}>
                    <p className="text-sm">
                      <Link href={`/admin/batch/${e.batches.id}`} className="font-medium text-stone-900 hover:underline">
                        {e.batches.programs.name} · {e.batches.name}
                      </Link>{" "}
                      <Badge value={e.status} />
                    </p>
                    <p className="text-xs text-stone-500">
                      Mulai {formatDate(e.batches.start_date)} · bayar {e.plan === "bulanan" ? "per bulan" : "sekali"}
                      {e.referral_code ? ` · referral ${e.referral_code}` : ""}
                    </p>
                    <div className="-mx-5 mt-2 overflow-x-auto">
                      <table className={tableClass}>
                        <thead className="bg-stone-50">
                          <tr>
                            <th className={thClass}>Tagihan</th>
                            <th className={thClass}>Nominal</th>
                            <th className={thClass}>Status</th>
                            <th className={thClass}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {[...e.invoices]
                            .sort((a, b) => a.installment_no - b.installment_no)
                            .map((i) => (
                              <tr key={i.id} className="border-t border-stone-100">
                                <td className={tdClass}>
                                  <a href={withBase(`/bayar/${i.code}`)} target="_blank" rel="noreferrer" className="font-mono text-xs hover:underline">
                                    {i.code}
                                  </a>
                                  <span className="block text-xs text-stone-500">
                                    {i.installment_no > 1 ? `Cicilan ke-${i.installment_no} · ` : ""}
                                    {i.paid_at ? `lunas ${formatDateTime(i.paid_at)}` : `jatuh tempo ${formatDateTime(i.due_at)}`}
                                  </span>
                                </td>
                                <td className={`${tdClass} tabular-nums`}>{formatRupiah(i.amount)}</td>
                                <td className={tdClass}>
                                  <Badge value={i.status} />
                                </td>
                                <td className={tdClass}>{(i.status === "belum" || i.status === "ditolak") && <InvoiceActions invoiceId={i.id} />}</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card title="Belajar">
            <p className="text-sm text-stone-700">Hadir di {attendanceRes.count ?? 0} sesi.</p>
            {results.length === 0 ? (
              <p className="mt-2 text-sm text-stone-500">Belum ada nilai ujian.</p>
            ) : (
              <ul className="mt-2 divide-y divide-stone-100 text-sm">
                {results.map((r, k) => (
                  <li key={k} className="flex justify-between py-1.5">
                    <span>{r.exams.title}</span>
                    <span className="font-medium">
                      {r.score}/{r.exams.max_score}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Data peserta">
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
              {participantRows(profile).map(([label, value]) => (
                <div key={label} className="contents">
                  <dt className="text-stone-500">{label}</dt>
                  <dd className="break-words text-stone-900">{value ?? "-"}</dd>
                </div>
              ))}
              <dt className="text-stone-500">Kode referral</dt>
              <dd className="font-mono text-stone-900">{profile.referral_code ?? "-"}</dd>
            </dl>
          </Card>
          <Card title="Akun">
            <p className="mb-2 text-sm text-stone-600">Kalau siswa lupa password atau belum menerima link, kirim ulang dari sini.</p>
            <PasswordLinkButton profileId={profile.id} />
          </Card>
        </div>
      </div>
    </>
  );
}
