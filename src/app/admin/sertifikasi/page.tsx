import Link from "next/link";
import { deleteCertification, setCertificationBonus } from "@/app/admin/sertifikasi/actions";
import { CertificationForm } from "@/components/admin-controls";
import { BarList } from "@/components/admin/charts";
import { Card, Empty, PageTitle, smallButton, Stat, tableClass, tdClass, thClass, WaLink } from "@/components/admin/ui";
import { requireAdmin, requireDb } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { ConfirmButton } from "@/components/admin/confirm-button";

export const metadata = { title: "Sertifikasi" };

type Row = { id: string; kind: string; passed: boolean; exam_date: string | null; bonus_paid: boolean; profile_id: string; profiles: { full_name: string; whatsapp: string | null } };

const kindLabel = (k: string) => (k === "JFT" ? "JFT-Basic" : /^N/.test(k) ? `JLPT ${k}` : `Goethe ${k}`);

export default async function CertificationsPage() {
  await requireAdmin();
  const db = requireDb();
  const [rowsRes, studentsRes] = await Promise.all([
    db.from("certifications").select("id, kind, passed, exam_date, bonus_paid, profile_id, profiles(full_name, whatsapp)").order("exam_date", { ascending: false, nullsFirst: false }),
    db.from("profiles").select("id, full_name").eq("role", "siswa").order("full_name"),
  ]);
  const rows = (rowsRes.data ?? []) as unknown as Row[];
  const passed = rows.filter((r) => r.passed);
  const kinds = [...new Set(rows.map((r) => r.kind))];

  return (
    <>
      <PageTitle title="Sertifikasi" subtitle="Hasil JLPT, JFT-Basic, dan Goethe siswa, termasuk bonus kelulusan untuk pengajar." />
      <div className="mb-6 grid grid-cols-3 gap-3">
        <Stat label="Hasil tercatat" value={rows.length} />
        <Stat label="Lulus" value={passed.length} hint={rows.length ? `${Math.round((passed.length / rows.length) * 100)}% tingkat kelulusan` : undefined} />
        <Stat label="Bonus belum dibayar" value={passed.filter((r) => !r.bonus_paid).length} tone="alert" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <Card title="Hasil ujian" count={rows.length}>
          {rows.length === 0 ? (
            <Empty>Belum ada hasil ujian. Catat lewat form di bawah setelah pengumuman JLPT/JFT.</Empty>
          ) : (
            <div className="-mx-5 overflow-x-auto">
              <table className={tableClass}>
                <thead className="bg-stone-50">
                  <tr>
                    <th className={thClass}>Siswa</th>
                    <th className={thClass}>Ujian</th>
                    <th className={thClass}>Hasil</th>
                    <th className={thClass}>Bonus pengajar</th>
                    <th className={thClass}></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-t border-stone-100">
                      <td className={tdClass}>
                        <Link href={`/admin/siswa/${r.profile_id}`} className="font-medium text-stone-900 hover:underline">
                          {r.profiles.full_name}
                        </Link>{" "}
                        <WaLink number={r.profiles.whatsapp} />
                      </td>
                      <td className={tdClass}>
                        {kindLabel(r.kind)}
                        <span className="block text-xs text-stone-500">{r.exam_date ? formatDate(r.exam_date) : "-"}</span>
                      </td>
                      <td className={tdClass}>
                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${r.passed ? "bg-emerald-100 text-emerald-900" : "bg-stone-200 text-stone-600"}`}>
                          {r.passed ? "Lulus" : "Belum lulus"}
                        </span>
                      </td>
                      <td className={tdClass}>
                        {r.passed && (
                          <form action={setCertificationBonus.bind(null, r.id, !r.bonus_paid)}>
                            <button className={r.bonus_paid ? "text-xs text-stone-500 hover:underline" : smallButton}>{r.bonus_paid ? "Sudah dibayar" : "Tandai dibayar"}</button>
                          </form>
                        )}
                      </td>
                      <td className={tdClass}>
                        <form action={deleteCertification.bind(null, r.id)}>
                          <ConfirmButton
                            className="text-xs text-stone-500 hover:text-red-700"
                            title="Hapus catatan ujian ini?"
                            message={`Hasil ${kindLabel(r.kind)} milik ${r.profiles.full_name} akan dihapus.`}
                            confirmLabel="Ya, hapus"
                          >
                            Hapus
                          </ConfirmButton>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
        <Card title="Lulus per ujian">
          <BarList data={kinds.map((k) => ({ label: kindLabel(k), value: passed.filter((r) => r.kind === k).length }))} empty="Belum ada yang lulus." />
        </Card>
      </div>

      <Card title="Catat hasil ujian" className="mt-6">
        {(studentsRes.data ?? []).length === 0 ? <Empty>Belum ada siswa.</Empty> : <CertificationForm students={studentsRes.data ?? []} />}
      </Card>
    </>
  );
}
