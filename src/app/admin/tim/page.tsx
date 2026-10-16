import { setRole } from "@/app/admin/actions";
import { PasswordLinkButton, StaffForm } from "@/components/admin-controls";
import { Badge, Card, Empty, PageTitle, tableClass, tdClass, thClass, WaLink } from "@/components/admin/ui";
import { requireAdmin, requireDb } from "@/lib/auth";

export const metadata = { title: "Tim" };

const roles = ["pengajar", "konten", "admin", "siswa"] as const;

export default async function TeamPage() {
  const me = await requireAdmin();
  const db = requireDb();
  const [staffRes, batchesRes] = await Promise.all([
    db.from("profiles").select("id, full_name, email, whatsapp, role").neq("role", "siswa").order("role").order("full_name"),
    db.from("batches").select("name, teacher_id, programs(name)").neq("status", "selesai").not("teacher_id", "is", null),
  ]);
  const staff = staffRes.data ?? [];
  const teaching = new Map<string, string[]>();
  for (const b of (batchesRes.data ?? []) as unknown as { name: string; teacher_id: string; programs: { name: string } }[]) {
    teaching.set(b.teacher_id, [...(teaching.get(b.teacher_id) ?? []), `${b.programs.name} · ${b.name}`]);
  }

  return (
    <>
      <PageTitle title="Tim" subtitle="Admin, pengajar, dan tim konten yang bisa login ke website." />
      <Card title="Anggota tim" count={staff.length}>
        {staff.length === 0 ? (
          <Empty>Belum ada anggota tim.</Empty>
        ) : (
          <div className="-mx-5 overflow-x-auto">
            <table className={tableClass}>
              <thead className="bg-stone-50">
                <tr>
                  <th className={thClass}>Nama</th>
                  <th className={thClass}>Peran</th>
                  <th className={thClass}>Mengajar</th>
                  <th className={thClass}>Akun</th>
                </tr>
              </thead>
              <tbody>
                {staff.map((p) => (
                  <tr key={p.id} className="border-t border-stone-100">
                    <td className={tdClass}>
                      <span className="font-medium text-stone-900">{p.full_name}</span> <WaLink number={p.whatsapp} />
                      <span className="block text-xs text-stone-500">{p.email}</span>
                    </td>
                    <td className={tdClass}>
                      {p.id === me.id ? (
                        <Badge value={p.role} />
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {roles.map((r) => (
                            <form key={r} action={setRole.bind(null, p.id, r)}>
                              <button className={`rounded px-2 py-0.5 text-xs ${p.role === r ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-700 hover:bg-stone-200"}`}>{r}</button>
                            </form>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className={`${tdClass} text-xs`}>{teaching.get(p.id)?.join(", ") ?? <span className="text-stone-400">-</span>}</td>
                    <td className={tdClass}>{p.id !== me.id && <PasswordLinkButton profileId={p.id} />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-3 text-xs text-stone-500">Pengajar dipasang ke batch lewat halaman detail batch, bagian Pengaturan batch. Memilih &quot;siswa&quot; mencabut akses tim.</p>
      </Card>
      <Card title="Tambah anggota tim" className="mt-6">
        <p className="mb-4 text-sm text-stone-600">Akun dibuat tanpa password. Setelah disimpan, kirim link atur password ke orangnya lewat WhatsApp.</p>
        <StaffForm />
      </Card>
    </>
  );
}
