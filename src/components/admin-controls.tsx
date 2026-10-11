"use client";

import { useActionState, useState, useTransition } from "react";
import {
  acceptPayment,
  createBatch,
  createNextInstallment,
  rejectPayment,
  type BatchState,
  type VerifyState,
} from "@/app/admin/actions";
import { buttonClass, Field, inputClass, Notice } from "@/components/ui/form";

function WhatsappFollowUp({ state }: { state: VerifyState }) {
  if (!state.whatsappText) return null;
  const href = state.whatsapp
    ? `https://wa.me/${state.whatsapp}?text=${encodeURIComponent(state.whatsappText)}`
    : undefined;
  return (
    <div className="mt-2 space-y-2">
      <p className="text-sm text-stone-700">Email belum aktif. Kirim pesan ini ke siswa lewat WhatsApp:</p>
      <textarea readOnly value={state.whatsappText} rows={5} className={`${inputClass} text-xs`} />
      {href && (
        <a href={href} target="_blank" rel="noreferrer" className="inline-block rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white">
          Buka WhatsApp
        </a>
      )}
    </div>
  );
}

export function VerifyButtons({ invoiceId }: { invoiceId: string }) {
  const [state, setState] = useState<VerifyState>({});
  const [pending, start] = useTransition();
  const [reason, setReason] = useState("");

  if (state.done) {
    return (
      <div>
        <Notice tone={state.done === "accepted" ? "ok" : "info"}>
          {state.done === "accepted" ? "Diterima. Akun dan kelas siswa sudah aktif." : "Ditolak. Siswa bisa unggah ulang."}
        </Notice>
        <WhatsappFollowUp state={state} />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {state.error && <Notice tone="error">{state.error}</Notice>}
      <div className="flex flex-wrap gap-2">
        <button
          className="rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          disabled={pending}
          onClick={() => start(async () => setState(await acceptPayment(invoiceId)))}
        >
          Terima
        </button>
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Alasan tolak (opsional)"
          className={`${inputClass} max-w-xs flex-1 py-1.5 text-sm`}
        />
        <button
          className="rounded-lg border border-red-300 px-4 py-2 font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
          disabled={pending}
          onClick={() => start(async () => setState(await rejectPayment(invoiceId, reason)))}
        >
          Tolak
        </button>
      </div>
    </div>
  );
}

export function InstallmentButton({ enrollmentId }: { enrollmentId: string }) {
  const [result, setResult] = useState<{ code?: string; error?: string }>({});
  const [pending, start] = useTransition();
  if (result.code) {
    return (
      <a href={`/bayar/${result.code}`} className="text-sm font-semibold text-emerald-700 underline">
        Tagihan {result.code} dibuat
      </a>
    );
  }
  return (
    <span>
      <button
        className="text-sm font-semibold text-red-700 hover:underline disabled:opacity-60"
        disabled={pending}
        onClick={() => start(async () => setResult(await createNextInstallment(enrollmentId)))}
      >
        Buat tagihan bulan berikutnya
      </button>
      {result.error && <span className="ml-2 text-sm text-red-700">{result.error}</span>}
    </span>
  );
}

const DAYS = [
  { v: 1, l: "Sen" },
  { v: 2, l: "Sel" },
  { v: 3, l: "Rab" },
  { v: 4, l: "Kam" },
  { v: 5, l: "Jum" },
  { v: 6, l: "Sab" },
];

export function BatchForm({ programs }: { programs: { id: string; name: string; months: number | null }[] }) {
  const [state, action, pending] = useActionState(createBatch, {} as BatchState);
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        {state.error && <Notice tone="error">{state.error}</Notice>}
        {state.ok && <Notice tone="ok">{state.ok}</Notice>}
      </div>
      <Field label="Program">
        <select name="program_id" required className={inputClass}>
          {programs.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Nama batch">
        <input name="name" required placeholder="Batch 1 Malam" className={inputClass} />
      </Field>
      <Field label="Tanggal mulai">
        <input name="start_date" type="date" required className={inputClass} />
      </Field>
      <Field label="Jam mulai (WIB)">
        <input name="start_time" type="time" defaultValue="19:30" required className={inputClass} />
      </Field>
      <Field label="Jumlah minggu">
        <input name="weeks" type="number" min={1} max={52} defaultValue={12} required className={inputClass} />
      </Field>
      <Field label="Kuota">
        <input name="quota" type="number" min={1} max={50} defaultValue={10} required className={inputClass} />
      </Field>
      <fieldset>
        <legend className="mb-1 text-sm font-medium text-stone-700">Hari kelas</legend>
        <div className="flex flex-wrap gap-3 text-sm">
          {DAYS.map((d) => (
            <label key={d.v} className="flex items-center gap-1">
              <input type="checkbox" name="class_days" value={d.v} defaultChecked={d.v <= 4} /> {d.l}
            </label>
          ))}
        </div>
      </fieldset>
      <Field label="Hari ujian mingguan">
        <select name="exam_day" defaultValue="5" className={inputClass}>
          <option value="0">Tidak ada</option>
          {DAYS.map((d) => (
            <option key={d.v} value={d.v}>
              {d.l}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Keterangan jadwal (tampil ke calon siswa)">
        <input name="schedule_label" required defaultValue="Senin-Kamis 19.30-21.00 WIB, ujian Jumat" className={inputClass} />
      </Field>
      <Field label="Link Google Meet (bisa diisi nanti)">
        <input name="meeting_url" type="url" placeholder="https://meet.google.com/..." className={inputClass} />
      </Field>
      <div className="sm:col-span-2">
        <button className={buttonClass} disabled={pending}>
          {pending ? "Membuat..." : "Buat batch dan jadwal"}
        </button>
      </div>
    </form>
  );
}
