import Link from "next/link";
import { Card, Empty, PageTitle, tableClass, tdClass, thClass } from "@/components/admin/ui";
import { isAdminRole, requireDb, requireStaff } from "@/lib/auth";
import { formatDate, requestTime } from "@/lib/format";

export const metadata = { title: "Murid saya" };

type BatchRow = {
  id: string;
  name: string;
  programs: { name: string };
  sessions: { id: string; number: number; starts_at: string; kind: string }[];
  enrollments: { profile_id: string; status: string; profiles: { full_name: string } }[];
};

// Ringkasan murid untuk sensei: hanya nama, kelas, dan absensi di batch yang ia ajar.
// Sengaja tanpa WA, email, data pribadi, atau tagihan.
export default async function MuridPage() {
  const user = await requireStaff();
  const isAdmin = isAdminRole(user.role);
  const db = requireDb();

  let query = db
    .from("batches")
    .select("id, name, programs(name), sessions(id, number, starts_at, kind), enrollments(profile_id, status, profiles(full_name))")
    .eq("mode", "live")
    .neq("status", "selesai")
    .order("start_date");
  if (!isAdmin) query = query.eq("teacher_id", user.id);
  const { data } = await query;
  const batches = (data ?? []) as unknown as BatchRow[];

  const now = requestTime();
  const pastByBatch = new Map(
    batches.map((b) => [
      b.id,
      b.sessions.filter((s) => new Date(s.starts_at).getTime() < now).sort((x, y) => x.starts_at.localeCompare(y.starts_at)),
    ]),
  );
  const pastIds = [...pastByBatch.values()].flat().map((s) => s.id);
  const { data: attendanceData } = pastIds.length
    ? await db.from("attendance").select("session_id, profile_id, via").in("session_id", pastIds)
    : { data: [] };
  const attendance = new Map(((attendanceData ?? []) as { session_id: string; profile_id: string; via: string }[]).map((a) => [`${a.session_id}:${a.profile_id}`, a.via]));

  const rows = batches.flatMap((b) =>
    b.enrollments
      .filter((e) => e.status === "aktif" || e.status === "selesai")
      .map((e) => ({ batch: b, profileId: e.profile_id, name: e.profiles.full_name }))
      .sort((x, y) => x.name.localeCompare(y.name)),
  );

  return (
    <>
      <PageTitle
        title="Murid saya"
        subtitle={isAdmin ? "Semua murid di batch yang sedang berjalan, seperti yang dilihat sensei." : "Murid di kelas yang kamu ajar beserta absensinya."}
      />
      <Card count={rows.length}>
        {rows.length === 0 ? (
          <Empty>{isAdmin ? "Belum ada murid aktif." : "Belum ada murid di kelas kamu. Kalau kamu sudah ditugaskan ke batch, murid muncul setelah pembayarannya diverifikasi admin."}</Empty>
        ) : (
          <div className="-mx-5 overflow-x-auto">
            <table className={tableClass}>
              <thead className="bg-stone-50">
                <tr>
                  <th className={thClass}>Nama</th>
                  <th className={thClass}>Kelas</th>
                  <th className={thClass}>Hadir</th>
                  <th className={thClass}>5 sesi terakhir</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ batch, profileId, name }) => {
                  const past = pastByBatch.get(batch.id) ?? [];
                  const present = past.filter((s) => attendance.has(`${s.id}:${profileId}`)).length;
                  return (
                    <tr key={`${batch.id}:${profileId}`} className="border-t border-stone-100">
                      <td className={`${tdClass} font-medium text-stone-900`}>{name}</td>
                      <td className={tdClass}>
                        <Link href={`/admin/batch/${batch.id}`} className="hover:underline">
                          {batch.programs.name} · {batch.name}
                        </Link>
                      </td>
                      <td className={`${tdClass} whitespace-nowrap`}>
                        {past.length ? `${present}/${past.length} sesi (${Math.round((present / past.length) * 100)}%)` : "Belum mulai"}
                      </td>
                      <td className={tdClass}>
                        <div className="flex gap-1">
                          {past.slice(-5).map((s) => {
                            const via = attendance.get(`${s.id}:${profileId}`);
                            const label = `${s.kind === "ujian" ? "Ujian" : "Kelas"} ${s.number}, ${formatDate(s.starts_at)}: ${via ? (via === "rekaman" ? "hadir via rekaman" : "hadir") : "tidak hadir"}`;
                            return (
                              <span
                                key={s.id}
                                title={label}
                                aria-label={label}
                                className={`flex h-6 w-6 items-center justify-center rounded text-xs font-semibold ${
                                  via === "rekaman" ? "bg-amber-100 text-amber-800" : via ? "bg-emerald-100 text-emerald-800" : "bg-stone-100 text-stone-400"
                                }`}
                              >
                                {via === "rekaman" ? "R" : via ? "✓" : "–"}
                              </span>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-3 text-xs text-stone-500">
          ✓ hadir · R hadir via rekaman · – tidak hadir. Absen tercatat otomatis saat murid menekan Masuk kelas; koreksi manual di halaman kelas (klik nama kelas).
        </p>
      </Card>
    </>
  );
}
