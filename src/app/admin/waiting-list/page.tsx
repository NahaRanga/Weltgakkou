import { setLeadNote, setLeadStatus } from "@/app/admin/waiting-list/actions";
import { Card, Empty, FilterTabs, PageTitle, smallButton, tableClass, tdClass, thClass, WaLink } from "@/components/admin/ui";
import { inputClass } from "@/components/ui/form";
import { requireAdmin, requireDb } from "@/lib/auth";
import { withBase } from "@/lib/base-path";
import { formatDateTime } from "@/lib/format";

export const metadata = { title: "Waiting list" };

const statuses = ["baru", "dihubungi", "daftar", "batal"] as const;

type Lead = {
  id: string;
  full_name: string;
  whatsapp: string;
  email: string | null;
  program_slug: string | null;
  source: string | null;
  referral_code: string | null;
  note: string | null;
  status: (typeof statuses)[number];
  created_at: string;
};

export default async function WaitingListPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const status = typeof sp.status === "string" && (statuses as readonly string[]).includes(sp.status) ? sp.status : "";
  const program = typeof sp.program === "string" ? sp.program : "";
  await requireAdmin();
  const db = requireDb();

  let query = db.from("leads").select("id, full_name, whatsapp, email, program_slug, source, referral_code, note, status, created_at").order("created_at", { ascending: false }).limit(200);
  if (status) query = query.eq("status", status);
  if (program) query = query.eq("program_slug", program);

  const [leadsRes, countsRes, programsRes] = await Promise.all([
    query,
    db.from("leads").select("status"),
    db.from("programs").select("slug, name").order("created_at"),
  ]);
  const leads = (leadsRes.data ?? []) as Lead[];
  const counts = new Map<string, number>();
  for (const l of countsRes.data ?? []) counts.set(l.status, (counts.get(l.status) ?? 0) + 1);
  const programName = new Map((programsRes.data ?? []).map((p) => [p.slug, p.name]));

  return (
    <>
      <PageTitle
        title="Waiting list"
        subtitle="Calon siswa yang minta dikabari saat batch dibuka. Hubungi lewat WA, lalu ubah statusnya."
        action={
          <a href={withBase("/admin/waiting-list/export")} className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800">
            Export CSV
          </a>
        }
      />
      <Card>
        <FilterTabs
          base="/admin/waiting-list"
          param="status"
          current={status}
          options={[
            { value: "", label: "Semua", count: countsRes.data?.length },
            ...statuses.map((s) => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1), count: counts.get(s) ?? 0 })),
          ]}
        />
        <form className="mb-4 flex gap-2">
          {status && <input type="hidden" name="status" value={status} />}
          <select name="program" defaultValue={program} className={`${inputClass} max-w-xs`}>
            <option value="">Semua program</option>
            {(programsRes.data ?? []).map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.name}
              </option>
            ))}
          </select>
          <button className={smallButton}>Saring</button>
        </form>
        {leads.length === 0 ? (
          <Empty>Tidak ada data.</Empty>
        ) : (
          <div className="-mx-5 overflow-x-auto">
            <table className={tableClass}>
              <thead className="bg-stone-50">
                <tr>
                  <th className={thClass}>Nama</th>
                  <th className={thClass}>Program</th>
                  <th className={thClass}>Masuk</th>
                  <th className={thClass}>Status</th>
                  <th className={thClass}>Catatan</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((l) => (
                  <tr key={l.id} className="border-t border-stone-100">
                    <td className={tdClass}>
                      <span className="font-medium text-stone-900">{l.full_name}</span>{" "}
                      <WaLink
                        number={l.whatsapp}
                        text={`Halo ${l.full_name}, terima kasih sudah daftar waiting list ${programName.get(l.program_slug ?? "") ?? "kelas"} Weltgakkou.`}
                      />
                      <span className="block text-xs text-stone-500">
                        {l.email ?? ""}
                        {l.source ? ` · dari ${l.source}` : ""}
                        {l.referral_code ? ` · ref ${l.referral_code}` : ""}
                      </span>
                    </td>
                    <td className={tdClass}>{programName.get(l.program_slug ?? "") ?? l.program_slug ?? "-"}</td>
                    <td className={`${tdClass} text-xs text-stone-600`}>{formatDateTime(l.created_at)}</td>
                    <td className={tdClass}>
                      <div className="flex flex-wrap gap-1">
                        {statuses.map((s) => (
                          <form key={s} action={setLeadStatus.bind(null, l.id, s)}>
                            <button className={`rounded px-2 py-0.5 text-xs ${l.status === s ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-700 hover:bg-stone-200"}`}>{s}</button>
                          </form>
                        ))}
                      </div>
                    </td>
                    <td className={tdClass}>
                      <form action={setLeadNote.bind(null, l.id)} className="flex gap-1">
                        <input name="note" defaultValue={l.note ?? ""} placeholder="Catatan" className={`${inputClass} min-w-32 py-1 text-xs`} />
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
    </>
  );
}
