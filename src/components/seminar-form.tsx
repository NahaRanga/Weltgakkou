"use client";

import { useActionState, useEffect } from "react";
import { trackEvent } from "@/components/analytics";
import { Field, inputClass, Notice } from "@/components/ui/form";
import { registerSeminar, type SeminarState } from "@/app/(site)/seminar/actions";

const initial: SeminarState = { status: "idle" };

export type SeminarOption = { id: string; when: string; trialWhen: string | null; full: boolean };

export function SeminarForm({
  seminars,
  goals,
  adminWa,
}: {
  seminars: SeminarOption[];
  goals: readonly { value: string; label: string }[];
  adminWa: string;
}) {
  const [state, action, pending] = useActionState(registerSeminar, initial);

  // Konversi iklan: pendaftar seminar dihitung sebagai lead.
  useEffect(() => {
    if (state.status === "ok") trackEvent("Lead");
  }, [state.status]);

  if (state.status === "ok") {
    return (
      <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-6 text-emerald-950" role="status">
        <p className="text-lg font-bold">{state.message}</p>
        {state.when && (
          <ul className="mt-2 space-y-0.5 font-semibold text-red-700">
            <li>Seminar: {state.when}</li>
            {state.trialWhen && <li>Kelas trial: {state.trialWhen}</li>}
          </ul>
        )}
        <p className="mt-3 text-stone-700">
          Semua lewat Zoom. Link-nya dikirim admin lewat WhatsApp sebelum acara, jadi simpan nomor admin supaya link bisa langsung diklik.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          {state.calendars?.map((c) => (
            <a key={c.label} href={c.url} target="_blank" rel="noreferrer" className="rounded-lg bg-red-700 px-4 py-2.5 font-semibold text-white hover:bg-red-800">
              Simpan {c.label.toLowerCase()} ke Google Calendar
            </a>
          ))}
          <a href={adminWa} target="_blank" rel="noreferrer" className="rounded-lg border border-emerald-700 px-4 py-2.5 font-semibold text-emerald-800 hover:bg-emerald-100">
            Chat admin di WhatsApp
          </a>
        </div>
      </div>
    );
  }

  const err = state.fieldErrors ?? {};
  const v = state.values ?? {};
  const firstOpen = seminars.find((s) => !s.full)?.id ?? "";

  return (
    <form action={action} className="space-y-4" noValidate>
      {state.status === "error" && state.message && <Notice tone="error">{state.message}</Notice>}

      <fieldset>
        <legend className="mb-2 text-sm font-medium text-stone-700">Pilih jadwal</legend>
        <div className="space-y-2">
          {seminars.map((s) => (
            <label
              key={s.id}
              className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3 ${s.full ? "border-stone-200 bg-stone-50 text-stone-400" : "cursor-pointer border-stone-200 bg-white has-[:checked]:border-red-700 has-[:checked]:bg-red-50"}`}
            >
              <input type="radio" name="seminar_id" value={s.id} defaultChecked={(v.seminar_id || firstOpen) === s.id} disabled={s.full} className="accent-red-700" />
              <span>
                <span className="block font-semibold text-stone-900">Seminar: {s.when}</span>
                {s.trialWhen && <span className="block text-sm text-stone-600">+ Kelas trial: {s.trialWhen}</span>}
              </span>
              {s.full && <span className="ml-auto text-xs font-bold uppercase">Penuh</span>}
            </label>
          ))}
        </div>
        {err.seminar_id && <span className="mt-1 block text-sm text-red-700">{err.seminar_id}</span>}
      </fieldset>

      <Field label="Nama lengkap" error={err.full_name}>
        <input name="full_name" defaultValue={v.full_name} required autoComplete="name" className={inputClass} />
      </Field>

      <Field label="Nomor WhatsApp (link Zoom dikirim ke sini)" error={err.whatsapp}>
        <input name="whatsapp" defaultValue={v.whatsapp} required inputMode="tel" autoComplete="tel" placeholder="081234567890" className={inputClass} />
      </Field>

      <Field label="Email (opsional)" error={err.email}>
        <input name="email" defaultValue={v.email} type="email" autoComplete="email" className={inputClass} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Kota domisili (opsional)">
          <input name="city" defaultValue={v.city} autoComplete="address-level2" className={inputClass} />
        </Field>
        <Field label="Tujuan ke Jepang">
          <select name="goal" defaultValue={v.goal ?? ""} className={inputClass}>
            <option value="">Pilih</option>
            {goals.map((g) => (
              <option key={g.value} value={g.value}>
                {g.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Tahu seminar ini dari mana?">
        <select name="source" defaultValue={v.source ?? ""} className={inputClass}>
          <option value="">Pilih</option>
          <option value="instagram">Instagram</option>
          <option value="tiktok">TikTok</option>
          <option value="facebook">Facebook</option>
          <option value="teman">Teman atau keluarga</option>
          <option value="lpk">LPK</option>
          <option value="lainnya">Lainnya</option>
        </select>
      </Field>

      <Field label="Pertanyaan buat sesi tanya jawab (opsional)">
        <textarea name="question" defaultValue={v.question} rows={3} className={inputClass} />
      </Field>

      {/* Honeypot untuk bot, disembunyikan dari pengguna. */}
      <div aria-hidden="true" className="hidden">
        <input name="website" tabIndex={-1} autoComplete="off" />
      </div>

      <button type="submit" disabled={pending} className="w-full rounded-xl bg-red-700 px-4 py-3.5 text-lg font-bold text-white hover:bg-red-800 disabled:opacity-60">
        {pending ? "Mengirim..." : seminars.some((s) => s.trialWhen) ? "Daftar seminar + trial gratis" : "Daftar seminar gratis"}
      </button>
    </form>
  );
}
