"use client";

import { useActionState } from "react";
import { joinWaitingList, type WaitingListState } from "@/app/waiting-list/actions";
import type { Program } from "@/lib/programs";

const initial: WaitingListState = { status: "idle" };

const inputClass =
  "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-900 focus:border-red-700 focus:outline-none focus:ring-2 focus:ring-red-700/20";

export function WaitingListForm({
  programs,
  defaultProgram,
}: {
  programs: Pick<Program, "slug" | "name" | "open">[];
  defaultProgram?: string;
}) {
  const [state, action, pending] = useActionState(joinWaitingList, initial);

  if (state.status === "ok") {
    return (
      <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-6 text-emerald-900" role="status">
        {state.message}
      </div>
    );
  }

  const err = state.fieldErrors ?? {};
  const v = state.values ?? {};

  return (
    <form action={action} className="space-y-4" noValidate>
      {state.status === "error" && state.message && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800" role="alert">
          {state.message}
        </p>
      )}

      <Field label="Nama lengkap" error={err.full_name}>
        <input name="full_name" defaultValue={v.full_name} required autoComplete="name" className={inputClass} />
      </Field>

      <Field label="Nomor WhatsApp" error={err.whatsapp}>
        <input name="whatsapp" defaultValue={v.whatsapp} required inputMode="tel" autoComplete="tel" placeholder="081234567890" className={inputClass} />
      </Field>

      <Field label="Email (opsional)" error={err.email}>
        <input name="email" defaultValue={v.email} type="email" autoComplete="email" className={inputClass} />
      </Field>

      <Field label="Program yang diminati" error={err.program_slug}>
        <select name="program_slug" defaultValue={v.program_slug || defaultProgram || ""} required className={inputClass}>
          <option value="" disabled>
            Pilih program
          </option>
          {programs.map((p) => (
            <option key={p.slug} value={p.slug}>
              {p.name}
              {p.open ? "" : " (segera dibuka)"}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Tahu Weltgakkou dari mana?">
        <select name="source" defaultValue={v.source ?? ""} className={inputClass}>
          <option value="">Pilih</option>
          <option value="tiktok">TikTok</option>
          <option value="instagram">Instagram</option>
          <option value="youtube">YouTube</option>
          <option value="teman">Teman atau keluarga</option>
          <option value="lpk">LPK</option>
          <option value="lainnya">Lainnya</option>
        </select>
      </Field>

      <Field label="Kode referral (opsional)">
        <input name="referral_code" defaultValue={v.referral_code} className={inputClass} />
      </Field>

      <Field label="Ada pertanyaan? (opsional)">
        <textarea name="note" defaultValue={v.note} rows={3} className={inputClass} />
      </Field>

      {/* Honeypot untuk bot, disembunyikan dari pengguna. */}
      <div aria-hidden="true" className="hidden">
        <input name="website" tabIndex={-1} autoComplete="off" />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-red-700 px-4 py-3 font-semibold text-white hover:bg-red-800 disabled:opacity-60"
      >
        {pending ? "Mengirim..." : "Masuk waiting list"}
      </button>
    </form>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-stone-700">{label}</span>
      {children}
      {error && <span className="mt-1 block text-sm text-red-700">{error}</span>}
    </label>
  );
}
