import Link from "next/link";
import { Badge, Card, Empty, FilterTabs, PageTitle, smallButton, tableClass, tdClass, thClass, WaLink } from "@/components/admin/ui";
import { inputClass } from "@/components/ui/form";
import { requireAdmin, requireDb } from "@/lib/auth";
import { formatDate } from "@/lib/format";

export const metadata = { title: "Siswa" };

type StudentRow = {
  id: string;
  full_name: string;
  whatsapp: string | null;
  email: string | null;
  domicile: string | null;
  created_at: string;
  enrollments: { status: string; batches: { id: string; name: string; programs: { name: string } } }[];
};

const views = [
  { value: "", label: "Semua" },
  { value: "aktif", label: "Aktif" },
  { value: "menunggu_bayar", label: "Menunggu bayar" },
  { value: "selesai", label: "Selesai" },
];

export default async function StudentsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const view = typeof sp.status === "string" && views.some((v) => v.value === sp.status) ? sp.status : "";
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const batch = typeof sp.batch === "string" && /^[0-9a-f-]{36}$/i.test(sp.batch) ? sp.batch : "";
  await requireAdmin();
  const db = requireDb();

  let query = db
    .from("profiles")
    .select(`id, full_name, whatsapp, email, domicile, created_at, enrollments${view || batch ? "!inner" : ""}(status, batch_id, batches(id, name, programs(name)))`)
    .eq("role", "siswa")
    .order("created_at", { ascending: false })
    .limit(200);
  if (view) query = query.eq("enrollments.status", view);
  if (batch) query = query.eq("enrollments.batch_id", batch);
  if (q) {
    const term = q.replace(/[%,()]/g, " ");
    query = query.or(`full_name.ilike.%${term}%,email.ilike.%${term}%,whatsapp.ilike.%${term.replace(/^0/, "62")}%`);
  }
  const [{ data }, batchesRes] = await Promise.all([query, db.from("batches").select("id, name, programs(name)").order("start_date", { ascending: false })]);
  const batches = (batchesRes.data ?? []) as unknown as { id: string; name: string; programs: { name: string } }[];
  const students = (data ?? []) as unknown as StudentRow[];

  return (
    <>
      <PageTitle title="Siswa" subtitle="Semua orang yang pernah mendaftar kelas." />
      <Card>
        <FilterTabs base="/admin/siswa" param="status" current={view} options={views} />
        <form className="mb-4 flex flex-wrap gap-2">
          {view && <input type="hidden" name="status" value={view} />}
          <input name="q" defaultValue={q} placeholder="Cari nama, email, atau nomor WA" className={`${inputClass} max-w-md`} />
          <select name="batch" defaultValue={batch} className={`${inputClass} max-w-xs`}>
            <option value="">Semua batch</option>
            {batches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.programs.name} · {b.name}
              </option>
            ))}
          </select>
          <button className={smallButton}>Cari</button>
        </form>
        {students.length === 0 ? (
          <Empty>Tidak ada siswa.</Empty>
        ) : (
          <div className="-mx-5 overflow-x-auto">
            <table className={tableClass}>
              <thead className="bg-stone-50">
                <tr>
                  <th className={thClass}>Nama</th>
                  <th className={thClass}>Kelas</th>
                  <th className={thClass}>Domisili</th>
                  <th className={thClass}>Daftar</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.id} className="border-t border-stone-100 hover:bg-stone-50">
                    <td className={tdClass}>
                      <Link href={`/admin/siswa/${s.id}`} className="font-medium text-stone-900 hover:underline">
                        {s.full_name}
                      </Link>{" "}
                      <WaLink number={s.whatsapp} />
                      <span className="block text-xs text-stone-500">{s.email}</span>
                    </td>
                    <td className={tdClass}>
                      {s.enrollments.length === 0 ? (
                        <span className="text-stone-400">-</span>
                      ) : (
                        <ul className="space-y-1">
                          {s.enrollments.map((e) => (
                            <li key={e.batches.id}>
                              <Link href={`/admin/batch/${e.batches.id}`} className="hover:underline">
                                {e.batches.programs.name} · {e.batches.name}
                              </Link>{" "}
                              <Badge value={e.status} />
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                    <td className={tdClass}>{s.domicile ?? "-"}</td>
                    <td className={`${tdClass} whitespace-nowrap`}>{formatDate(s.created_at)}</td>
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
