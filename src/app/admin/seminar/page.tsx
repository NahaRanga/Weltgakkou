import { createSeminar, setSeminarAttended, setSeminarNote, updateSeminar } from "@/app/admin/seminar/actions";
import { SeminarWaButton } from "@/components/admin/seminar-wa-button";
import { Card, Empty, FilterTabs, PageTitle, smallButton, Stat, tableClass, tdClass, thClass } from "@/components/admin/ui";
import { inputClass } from "@/components/ui/form";
import { requireAdmin, requireDb } from "@/lib/auth";
import { withBase } from "@/lib/base-path";
import { formatDateTime, requestTime } from "@/lib/format";
import { goalLabel, reminderKinds, seminarMessage, seminarWhen, type ReminderKind, type Seminar } from "@/lib/seminars";

export const metadata = { title: "Seminar" };

type Registration = {
  id: string;
  full_name: string;
  whatsapp: string;
  email: string | null;
  city: string | null;
  goal: string | null;
  source: string | null;
  question: string | null;
  confirmed_at: string | null;
  reminded_h1_at: string | null;
  reminded_h0_at: string | null;
  followed_up_at: string | null;
  attended: boolean;
  note: string | null;
  created_at: string;
};

const kinds = Object.keys(reminderKinds) as ReminderKind[];

export default async function SeminarAdminPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  await requireAdmin();
  const db = requireDb();

  const { data, error } = await db
    .from("seminars")
    .select("id, title, starts_at, duration_minutes, meeting_url, quota, is_open")
    .order("starts_at", { ascending: false })
    .limit(12);
  if (error) {
    return (
      <>
        <PageTitle title="Seminar" />
        <Card>
          <Empty>Tabel seminar belum ada. Jalankan migrasi supabase/migrations/0007_seminar.sql di SQL Editor Supabase.</Empty>
        </Card>
      </>
    );
  }
  const seminars = (data ?? []) as Seminar[];
  const now = requestTime();
  // Default: seminar terdekat yang belum lewat, kalau tidak ada ya yang terakhir.
  const nextUp = [...seminars].reverse().find((s) => new Date(s.starts_at).getTime() + s.duration_minutes * 60_000 > now);
  const current = seminars.find((s) => s.id === sp.id) ?? nextUp ?? seminars[0];

  const regs = current
    ? (((
        await db
          .from("seminar_registrations")
          .select("id, full_name, whatsapp, email, city, goal, source, question, confirmed_at, reminded_h1_at, reminded_h0_at, followed_up_at, attended, note, created_at")
          .eq("seminar_id", current.id)
          .order("created_at")
      ).data ?? []) as Registration[])
    : [];
  const started = current ? new Date(current.starts_at).getTime() <= now : false;
  const count = (k: ReminderKind) => regs.filter((r) => r[reminderKinds[k].column]).length;

  return (
    <>
      <PageTitle
        title="Seminar"
        subtitle="Pendaftar seminar gratis. Klik tombol hijau untuk buka WhatsApp dengan pesan siap kirim; tombol otomatis ditandai ✓."
        action={
          current && (
            <a href={withBase(`/admin/seminar/export?id=${current.id}`)} className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800">
              Export CSV
            </a>
          )
        }
      />

      {seminars.length > 0 && (
        <FilterTabs
          base="/admin/seminar"
          param="id"
          current={current?.id ?? ""}
          options={[...seminars].reverse().map((s) => ({ value: s.id, label: seminarWhen(s).replace(/ \d{4},/, ",") }))}
        />
      )}

      {current && (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Pendaftar" value={regs.length} hint={current.quota ? `kuota ${current.quota}` : "tanpa kuota"} />
            <Stat label="Sudah dikonfirmasi" value={count("konfirmasi")} tone={count("konfirmasi") < regs.length ? "alert" : "plain"} />
            <Stat label="Pengingat H-1 / 1 jam" value={`${count("h1")} / ${count("h0")}`} />
            <Stat label="Hadir" value={regs.filter((r) => r.attended).length} hint={`follow-up ${count("followup")}`} />
          </div>

          <Card title={`${current.title} · ${seminarWhen(current)}`} className="mb-6">
            <form action={updateSeminar.bind(null, current.id)} className="grid gap-3 sm:grid-cols-[1fr_8rem_auto_auto] sm:items-end">
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-stone-700">Link Zoom</span>
                <input name="meeting_url" defaultValue={current.meeting_url ?? ""} placeholder="https://us06web.zoom.us/j/..." className={inputClass} />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-stone-700">Kuota</span>
                <input name="quota" type="number" min={1} defaultValue={current.quota ?? ""} placeholder="bebas" className={inputClass} />
              </label>
              <label className="flex items-center gap-2 pb-2 text-sm">
                <input type="checkbox" name="is_open" defaultChecked={current.is_open} className="accent-red-700" /> Pendaftaran dibuka
              </label>
              <button className={smallButton}>Simpan</button>
            </form>
            {!current.meeting_url && <p className="mt-3 text-sm text-amber-700">Isi link Zoom dulu supaya tombol H-1 dan 1 jam lagi bisa dipakai.</p>}
            <p className="mt-3 text-sm text-stone-500">
              Halaman publik: <a href={withBase("/seminar")} target="_blank" rel="noreferrer" className="font-medium text-red-700 hover:underline">weltgakko.com/seminar</a>
            </p>
          </Card>

          <Card title="Pendaftar" count={regs.length} className="mb-6">
            {regs.length === 0 ? (
              <Empty>Belum ada pendaftar.</Empty>
            ) : (
              <div className="-mx-5 overflow-x-auto">
                <table className={tableClass}>
                  <thead className="bg-stone-50">
                    <tr>
                      <th className={thClass}>Nama</th>
                      <th className={thClass}>Pesan WA</th>
                      <th className={thClass}>Hadir</th>
                      <th className={thClass}>Catatan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {regs.map((r) => (
                      <tr key={r.id} className="border-t border-stone-100">
                        <td className={tdClass}>
                          <span className="font-medium text-stone-900">{r.full_name}</span>
                          <span className="block text-xs text-stone-500">
                            +{r.whatsapp}
                            {r.city ? ` · ${r.city}` : ""}
                            {r.goal ? ` · ${goalLabel(r.goal)}` : ""}
                            {r.source ? ` · dari ${r.source}` : ""}
                          </span>
                          <span className="block text-xs text-stone-400">daftar {formatDateTime(r.created_at)}</span>
                          {r.question && <span className="mt-1 block max-w-xs text-xs italic text-stone-600">“{r.question}”</span>}
                        </td>
                        <td className={tdClass}>
                          <div className="flex flex-wrap gap-1.5">
                            {kinds.map((k) => (
                              <SeminarWaButton
                                key={k}
                                id={r.id}
                                kind={k}
                                label={reminderKinds[k].label}
                                number={r.whatsapp}
                                text={seminarMessage(k, current, { name: r.full_name, attended: r.attended })}
                                sentAt={r[reminderKinds[k].column]}
                                disabledReason={
                                  (k === "h1" || k === "h0") && !current.meeting_url
                                    ? "Isi link Zoom dulu"
                                    : k === "followup" && !started
                                      ? "Dipakai setelah seminar selesai"
                                      : undefined
                                }
                              />
                            ))}
                          </div>
                        </td>
                        <td className={tdClass}>
                          <form action={setSeminarAttended.bind(null, r.id, !r.attended)}>
                            <button className={`rounded px-2 py-0.5 text-xs ${r.attended ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-700 hover:bg-stone-200"}`}>
                              {r.attended ? "Hadir" : "Belum"}
                            </button>
                          </form>
                        </td>
                        <td className={tdClass}>
                          <form action={setSeminarNote.bind(null, r.id)} className="flex gap-1">
                            <input name="note" defaultValue={r.note ?? ""} placeholder="Catatan" className={`${inputClass} min-w-32 py-1 text-xs`} />
                            <button className="text-xs text-stone-600 hover:underline">Simpan</button>
                          </form>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {regs.length > 0 && (
            <Card title="Kirim massal lewat broadcast WA" className="mb-6">
              <p className="mb-3 text-sm text-stone-600">
                Untuk banyak peserta sekaligus: salin nomor ke daftar broadcast WhatsApp Business (penerima harus sudah menyimpan nomor admin), lalu kirim teks di bawah.
                Pesan broadcast tidak ditandai otomatis di tabel.
              </p>
              <label className="mb-3 block text-sm">
                <span className="mb-1 block font-medium text-stone-700">Nomor peserta</span>
                <textarea readOnly rows={3} value={regs.map((r) => `+${r.whatsapp}`).join("\n")} className={`${inputClass} font-mono text-xs`} />
              </label>
              <div className="grid gap-3 lg:grid-cols-3">
                {(["h1", "h0", "followup"] as const).map((k) => (
                  <label key={k} className="block text-sm">
                    <span className="mb-1 block font-medium text-stone-700">{reminderKinds[k].label}</span>
                    <textarea readOnly rows={9} value={seminarMessage(k, current)} className={`${inputClass} text-xs`} />
                  </label>
                ))}
              </div>
            </Card>
          )}
        </>
      )}

      <Card title="Tambah jadwal seminar">
        <form action={createSeminar} className="grid gap-3 sm:grid-cols-[1fr_10rem_7rem_auto] sm:items-end">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-stone-700">Judul</span>
            <input name="title" defaultValue="Mengenal Jepang Lebih Dekat" className={inputClass} />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-stone-700">Tanggal</span>
            <input name="date" type="date" required className={inputClass} />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-stone-700">Jam (WIB)</span>
            <input name="time" type="time" defaultValue="17:00" required className={inputClass} />
          </label>
          <button className={smallButton}>Tambah</button>
        </form>
      </Card>
    </>
  );
}
