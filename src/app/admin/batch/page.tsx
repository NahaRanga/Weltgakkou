import Link from "next/link";
import { BatchForm } from "@/components/admin-controls";
import { Badge, Card, Empty, FilterTabs, PageTitle, tableClass, tdClass, thClass } from "@/components/admin/ui";
import { requireDb, requireStaff } from "@/lib/auth";
import { formatDate } from "@/lib/format";

export const metadata = { title: "Batch & kelas" };

type BatchRow = {
  id: string;
  name: string;
  status: string;
  start_date: string;
  quota: number;
  schedule_label: string;
  programs: { name: string };
  teacher: { full_name: string } | null;
  enrollments: { status: string }[];
};

export default async function BatchesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const view = sp.status === "selesai" || sp.status === "semua" ? sp.status : "";
  const user = await requireStaff();
  const isAdmin = user.role === "admin";
  const db = requireDb();

  let query = db
    .from("batches")
    .select("id, name, status, start_date, quota, schedule_label, programs(name), teacher:profiles!batches_teacher_id_fkey(full_name), enrollments(status)")
    .order("start_date", { ascending: view === "" });
  if (view === "") query = query.neq("status", "selesai");
  if (view === "selesai") query = query.eq("status", "selesai");
  if (!isAdmin) query = query.eq("teacher_id", user.id);

  const [batchesRes, programsRes] = await Promise.all([query, db.from("programs").select("id, name, months").eq("active", true).order("created_at")]);
  const batches = (batchesRes.data ?? []) as unknown as BatchRow[];

  return (
    <>
      <PageTitle
        title={isAdmin ? "Batch & kelas" : "Kelas saya"}
        subtitle="Klik batch untuk mengatur absensi, nilai ujian, dan materi."
        action={
          isAdmin && (
            <a href="#buat" className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800">
              Buat batch baru
            </a>
          )
        }
      />
      <Card>
        <FilterTabs
          base="/admin/batch"
          param="status"
          current={view}
          options={[
            { value: "", label: "Dibuka & berjalan" },
            { value: "selesai", label: "Selesai" },
            { value: "semua", label: "Semua" },
          ]}
        />
        {batches.length === 0 ? (
          <Empty>Belum ada batch di sini.</Empty>
        ) : (
          <div className="-mx-5 overflow-x-auto">
            <table className={tableClass}>
              <thead className="bg-stone-50">
                <tr>
                  <th className={thClass}>Batch</th>
                  <th className={thClass}>Mulai</th>
                  <th className={thClass}>Pengajar</th>
                  <th className={thClass}>Siswa</th>
                  <th className={thClass}>Status</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((b) => {
                  const active = b.enrollments.filter((e) => e.status === "aktif").length;
                  const waiting = b.enrollments.filter((e) => e.status === "menunggu_bayar").length;
                  return (
                    <tr key={b.id} className="border-t border-stone-100 hover:bg-stone-50">
                      <td className={tdClass}>
                        <Link href={`/admin/batch/${b.id}`} className="font-medium text-stone-900 hover:underline">
                          {b.programs.name} · {b.name}
                        </Link>
                        <span className="block text-xs text-stone-500">{b.schedule_label}</span>
                      </td>
                      <td className={`${tdClass} whitespace-nowrap`}>{formatDate(b.start_date)}</td>
                      <td className={tdClass}>{b.teacher?.full_name ?? <span className="text-stone-400">Belum ada</span>}</td>
                      <td className={`${tdClass} whitespace-nowrap`}>
                        {active}/{b.quota}
                        {waiting > 0 && <span className="block text-xs text-amber-700">+{waiting} menunggu bayar</span>}
                      </td>
                      <td className={tdClass}>
                        <Badge value={b.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {isAdmin && (
      <div id="buat" className="scroll-mt-6">
        <Card title="Buat batch baru" className="mt-6">
          <p className="mb-4 text-sm text-stone-600">Jadwal kelas dan ujian mingguan dibuat otomatis dari tanggal mulai, hari kelas, dan jumlah minggu.</p>
          <BatchForm programs={programsRes.data ?? []} />
        </Card>
      </div>
      )}
    </>
  );
}
