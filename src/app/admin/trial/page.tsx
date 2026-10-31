import Link from "next/link";
import { Badge, Card, Empty, PageTitle, tableClass, tdClass, thClass, WaLink } from "@/components/admin/ui";
import { requireAdmin, requireDb } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { upcomingTrials } from "@/lib/batches";
import { TRIAL_NOTE } from "@/lib/site";

export const metadata = { title: "Pendaftar trial" };

type TrialEnrollment = {
  id: string;
  status: string;
  created_at: string;
  profiles: { full_name: string; whatsapp: string | null; email: string | null } | null;
};

type TrialBatch = {
  id: string;
  name: string;
  status: string;
  quota: number;
  start_date: string;
  meeting_url: string | null;
  programs: { name: string } | null;
  sessions: { id: string; starts_at: string }[];
  enrollments: TrialEnrollment[];
};

// Semua orang yang daftar kelas trial gratis lewat /trial, dikelompokkan per batch trial.
export default async function TrialPage() {
  await requireAdmin();
  const db = requireDb();

  const [batchesRes, open, leadsRes] = await Promise.all([
    db
      .from("batches")
      .select(
        "id, name, status, quota, start_date, meeting_url, programs(name), sessions(id, starts_at), enrollments(id, status, created_at, profiles(full_name, whatsapp, email))",
      )
      .eq("is_trial", true)
      .order("start_date", { ascending: false }),
    upcomingTrials(),
    // Isi form /trial saat jadwal trial belum dibuka (disimpan di waiting list).
    db
      .from("leads")
      .select("id, full_name, whatsapp, email, source, note, status, created_at")
      .like("note", `${TRIAL_NOTE}%`)
      .order("created_at", { ascending: false })
      .limit(200),
  ]);
  const interested = (leadsRes.data ?? []) as { id: string; full_name: string; whatsapp: string; email: string | null; source: string | null; note: string | null; status: string; created_at: string }[];
  const batches = (batchesRes.data ?? []) as unknown as TrialBatch[];
  const total = batches.reduce((n, b) => n + b.enrollments.filter((e) => e.status !== "keluar").length, 0);

  return (
    <>
      <PageTitle
        title="Pendaftar trial"
        subtitle="Orang yang daftar kelas trial gratis lewat weltgakko.com/trial. Mereka langsung dapat akun dan link Zoom di area belajar."
        action={
          <Link href="/admin/batch#buat" className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800">
            Buat jadwal trial
          </Link>
        }
      />

      {open.length === 0 && (
        <div className="mb-6 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">Belum ada jadwal trial yang dibuka, jadi halaman /trial tidak menampilkan form daftar.</p>
          <p className="mt-1">
            Pengunjung /trial sekarang cuma lihat tombol waiting list dan chat admin, jadi belum ada yang bisa daftar trial. Buat batch di{" "}
            <Link href="/admin/batch#buat" className="font-medium underline">
              Batch &amp; kelas
            </Link>{" "}
            dengan centang <b>Kelas trial gratis</b> (tanggal + jam = waktu kelas trial, kuota = batas peserta Zoom). Setelah itu form langsung muncul di /trial
            dan pendaftarnya tampil di halaman ini. Sementara itu, form di /trial menyimpan peminat ke daftar &quot;Minta dikabari jadwal trial&quot;.
          </p>
        </div>
      )}

      {interested.length > 0 && (
        <Card title="Minta dikabari jadwal trial" count={interested.length} className="mb-6">
          <p className="mb-3 text-sm text-stone-600">
            Mereka isi form di /trial waktu belum ada jadwal. Kirim link /trial lewat WA begitu jadwal dibuka, lalu ubah statusnya di{" "}
            <Link href="/admin/waiting-list" className="font-medium text-red-700 underline">
              Waiting list
            </Link>
            .
          </p>
          <div className="overflow-x-auto">
            <table className={tableClass}>
              <thead>
                <tr>
                  <th className={thClass}>Nama</th>
                  <th className={thClass}>Catatan</th>
                  <th className={thClass}>Masuk</th>
                  <th className={thClass}>Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {interested.map((l) => (
                  <tr key={l.id}>
                    <td className={tdClass}>
                      <span className="font-medium text-stone-900">{l.full_name}</span> <WaLink number={l.whatsapp} />
                      <span className="block text-xs text-stone-500">
                        {l.email ?? "tanpa email"}
                        {l.source ? ` · dari ${l.source}` : ""}
                      </span>
                    </td>
                    <td className={`${tdClass} text-stone-600`}>{(l.note ?? "").slice(TRIAL_NOTE.length).trim() || "-"}</td>
                    <td className={`${tdClass} whitespace-nowrap text-stone-600`}>{formatDateTime(l.created_at)}</td>
                    <td className={tdClass}>
                      <Badge value={l.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {batches.length === 0 ? (
        <Card>
          <Empty>Belum ada batch trial, jadi belum ada pendaftar trial.</Empty>
        </Card>
      ) : (
        <div className="space-y-6">
          <p className="text-sm text-stone-600">
            Total {total} pendaftar di {batches.length} jadwal trial.
          </p>
          {batches.map((b) => {
            const people = b.enrollments
              .filter((e) => e.status !== "keluar")
              .sort((x, y) => y.created_at.localeCompare(x.created_at));
            const first = [...b.sessions].sort((x, y) => x.starts_at.localeCompare(y.starts_at))[0];
            return (
              <Card
                key={b.id}
                title={`${b.programs?.name ?? "Trial"} · ${b.name}`}
                count={people.length}
                action={
                  <Link href={`/admin/batch/${b.id}`} className="text-sm font-medium text-red-700 hover:underline">
                    Buka batch
                  </Link>
                }
              >
                <p className="mb-3 text-sm text-stone-600">
                  Kelas: {first ? `${formatDateTime(first.starts_at)} WIB` : b.start_date} · kuota {b.quota} · <Badge value={b.status} />
                  {!b.meeting_url && <span className="ml-2 font-medium text-red-700">Link Zoom belum diisi</span>}
                </p>
                {people.length === 0 ? (
                  <Empty>Belum ada yang daftar di jadwal ini.</Empty>
                ) : (
                  <div className="overflow-x-auto">
                    <table className={tableClass}>
                      <thead>
                        <tr>
                          <th className={thClass}>Nama</th>
                          <th className={thClass}>Email</th>
                          <th className={thClass}>Daftar</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {people.map((e) => (
                          <tr key={e.id}>
                            <td className={tdClass}>
                              <span className="font-medium text-stone-900">{e.profiles?.full_name ?? "-"}</span> <WaLink number={e.profiles?.whatsapp} />
                            </td>
                            <td className={`${tdClass} text-stone-600`}>{e.profiles?.email ?? "-"}</td>
                            <td className={`${tdClass} whitespace-nowrap text-stone-600`}>{formatDateTime(e.created_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
