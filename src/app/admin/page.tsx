import type { Metadata } from "next";
import { Suspense } from "react";
import { setBatchMeetingUrl, setBatchStatus, setLeadStatus } from "@/app/admin/actions";
import { BatchForm, InstallmentButton, VerifyButtons } from "@/components/admin-controls";
import { inputClass } from "@/components/ui/form";
import { requireAdmin, requireDb } from "@/lib/auth";
import { expireOverdueInvoices } from "@/lib/billing";
import { formatDate, formatDateTime } from "@/lib/format";
import { formatRupiah } from "@/lib/programs";
import { withBase } from "@/lib/base-path";

export const metadata: Metadata = { title: "Admin", robots: { index: false } };

export default function AdminPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <Suspense fallback={<p className="text-stone-500">Memuat data admin...</p>}>
        <AdminContent />
      </Suspense>
    </div>
  );
}

function Section({ title, children, count }: { title: string; children: React.ReactNode; count?: number }) {
  return (
    <section className="mt-10">
      <h2 className="text-xl font-bold text-stone-900">
        {title}
        {count !== undefined && <span className="ml-2 text-base font-normal text-stone-500">{count}</span>}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

type PendingInvoice = {
  id: string;
  code: string;
  amount: number;
  unique_code: number;
  installment_no: number;
  method: string | null;
  enrollments: { profiles: { full_name: string; whatsapp: string | null }; batches: { name: string; programs: { name: string } } };
  payment_proofs: { file_path: string; uploaded_at: string }[];
};

type BatchRow = {
  id: string;
  name: string;
  status: "buka" | "berjalan" | "selesai";
  start_date: string;
  quota: number;
  meeting_url: string | null;
  programs: { name: string };
  enrollments: {
    id: string;
    status: string;
    plan: string;
    profiles: { full_name: string; whatsapp: string | null };
    invoices: { installment_no: number; status: string }[];
  }[];
};

async function AdminContent() {
  const admin = await requireAdmin();
  const db = requireDb();
  await expireOverdueInvoices(db);

  const [pendingRes, batchesRes, leadsRes, programsRes] = await Promise.all([
    db
      .from("invoices")
      .select(
        "id, code, amount, unique_code, installment_no, method, enrollments(profiles(full_name, whatsapp), batches(name, programs(name))), payment_proofs(file_path, uploaded_at)",
      )
      .eq("status", "menunggu_verifikasi")
      .order("created_at"),
    db
      .from("batches")
      .select(
        "id, name, status, start_date, quota, meeting_url, programs(name), enrollments(id, status, plan, profiles(full_name, whatsapp), invoices(installment_no, status))",
      )
      .neq("status", "selesai")
      .order("start_date"),
    db.from("leads").select("id, full_name, whatsapp, program_slug, source, status, created_at").order("created_at", { ascending: false }).limit(50),
    db.from("programs").select("id, name, months").eq("active", true).order("created_at"),
  ]);

  const pending = (pendingRes.data ?? []) as unknown as PendingInvoice[];
  const batches = (batchesRes.data ?? []) as unknown as BatchRow[];

  // Link foto bukti berlaku 1 jam (bucket privat).
  const proofUrls = new Map<string, string>();
  await Promise.all(
    pending.map(async (inv) => {
      const latest = [...inv.payment_proofs].sort((a, b) => b.uploaded_at.localeCompare(a.uploaded_at))[0];
      if (!latest) return;
      const { data } = await db.storage.from("payment-proofs").createSignedUrl(latest.file_path, 3600);
      if (data) proofUrls.set(inv.id, data.signedUrl);
    }),
  );

  return (
    <>
      <h1 className="text-3xl font-bold text-stone-900">Admin Weltgakkou</h1>
      <p className="text-stone-600">Masuk sebagai {admin.fullName}</p>

      <Section title="Menunggu verifikasi" count={pending.length}>
        {pending.length === 0 ? (
          <p className="text-stone-500">Tidak ada bukti bayar yang menunggu.</p>
        ) : (
          <div className="space-y-4">
            {pending.map((inv) => (
              <div key={inv.id} className="grid gap-4 rounded-xl border border-stone-200 bg-white p-5 sm:grid-cols-[1fr_200px]">
                <div className="space-y-2">
                  <p className="font-semibold text-stone-900">{inv.enrollments.profiles.full_name}</p>
                  <p className="text-sm text-stone-600">
                    {inv.enrollments.batches.programs.name} · {inv.enrollments.batches.name}
                    {inv.installment_no > 1 ? ` · cicilan ke-${inv.installment_no}` : ""}
                  </p>
                  <p className="text-2xl font-bold text-stone-900">{formatRupiah(inv.amount)}</p>
                  <p className="text-sm text-stone-600">
                    Kode unik {inv.unique_code} · {inv.method === "qris" ? "QRIS" : "Transfer"} · tagihan {inv.code}
                  </p>
                  <VerifyButtons invoiceId={inv.id} />
                </div>
                {proofUrls.get(inv.id) && (
                  <a href={proofUrls.get(inv.id)} target="_blank" rel="noreferrer" className="block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={proofUrls.get(inv.id)} alt="Bukti bayar" className="max-h-64 w-full rounded-lg border object-contain" />
                    <span className="text-xs text-stone-500">Buka ukuran penuh</span>
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Batch berjalan dan dibuka" count={batches.length}>
        <div className="space-y-4">
          {batches.map((b) => {
            const active = b.enrollments.filter((e) => e.status === "aktif");
            const waiting = b.enrollments.filter((e) => e.status === "menunggu_bayar");
            return (
              <details key={b.id} className="rounded-xl border border-stone-200 bg-white p-5">
                <summary className="cursor-pointer">
                  <span className="font-semibold text-stone-900">
                    {b.programs.name} · {b.name}
                  </span>
                  <span className="ml-2 text-sm text-stone-600">
                    mulai {formatDate(b.start_date)} · {active.length} aktif, {waiting.length} menunggu bayar, kuota {b.quota} ·{" "}
                    {b.status}
                  </span>
                </summary>
                <div className="mt-4 space-y-4">
                  <form action={setBatchMeetingUrl.bind(null, b.id)} className="flex flex-wrap gap-2">
                    <input name="meeting_url" defaultValue={b.meeting_url ?? ""} placeholder="https://meet.google.com/..." className={`${inputClass} max-w-md flex-1`} />
                    <button className="rounded-lg border border-stone-300 px-3 py-2 text-sm font-semibold">Simpan link Meet</button>
                  </form>
                  <div className="flex gap-2 text-sm">
                    {(["buka", "berjalan", "selesai"] as const)
                      .filter((s) => s !== b.status)
                      .map((s) => (
                        <form key={s} action={setBatchStatus.bind(null, b.id, s)}>
                          <button className="rounded-lg border border-stone-300 px-3 py-1.5">Tandai {s}</button>
                        </form>
                      ))}
                    <a href={withBase(`/daftar/${b.id}`)} className="px-3 py-1.5 text-red-700 underline">
                      Link pendaftaran
                    </a>
                  </div>
                  <table className="w-full text-left text-sm">
                    <thead className="text-stone-500">
                      <tr>
                        <th className="py-1">Siswa</th>
                        <th>Status</th>
                        <th>Bayar</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {b.enrollments
                        .filter((e) => e.status !== "keluar")
                        .map((e) => {
                          const paid = e.invoices.filter((i) => i.status === "lunas").length;
                          return (
                            <tr key={e.id} className="border-t border-stone-100">
                              <td className="py-2">
                                {e.profiles.full_name}
                                {e.profiles.whatsapp && (
                                  <a href={`https://wa.me/${e.profiles.whatsapp}`} target="_blank" rel="noreferrer" className="ml-2 text-emerald-700">
                                    WA
                                  </a>
                                )}
                              </td>
                              <td>{e.status === "aktif" ? "Aktif" : "Menunggu bayar"}</td>
                              <td>{e.plan === "bulanan" ? `${paid} bulan lunas` : paid ? "Lunas" : "-"}</td>
                              <td>{e.plan === "bulanan" && e.status === "aktif" && <InstallmentButton enrollmentId={e.id} />}</td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </details>
            );
          })}
        </div>
      </Section>

      <Section title="Buat batch baru">
        <div className="rounded-xl border border-stone-200 bg-white p-5">
          <BatchForm programs={programsRes.data ?? []} />
        </div>
      </Section>

      <Section title="Waiting list terbaru" count={leadsRes.data?.length}>
        <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-stone-50 text-stone-500">
              <tr>
                <th className="p-3">Nama</th>
                <th>Program</th>
                <th>Sumber</th>
                <th>Masuk</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {(leadsRes.data ?? []).map((l) => (
                <tr key={l.id} className="border-t border-stone-100">
                  <td className="p-3">
                    {l.full_name}{" "}
                    <a href={`https://wa.me/${l.whatsapp}`} target="_blank" rel="noreferrer" className="text-emerald-700">
                      WA
                    </a>
                  </td>
                  <td>{l.program_slug}</td>
                  <td>{l.source ?? "-"}</td>
                  <td>{formatDateTime(l.created_at)}</td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {(["baru", "dihubungi", "daftar", "batal"] as const).map((s) => (
                        <form key={s} action={setLeadStatus.bind(null, l.id, s)}>
                          <button
                            className={`rounded px-2 py-0.5 text-xs ${l.status === s ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-700"}`}
                          >
                            {s}
                          </button>
                        </form>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </>
  );
}
