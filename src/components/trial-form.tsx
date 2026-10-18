"use client";

import { startTransition, useActionState, useEffect, useRef } from "react";
import Link from "next/link";
import { trackEvent } from "@/components/analytics";
import { EmailWithCode } from "@/components/register-form";
import { registerTrial, type TrialState } from "@/app/(site)/trial/actions";
import { buttonClass, Field, inputClass, Notice } from "@/components/ui/form";

type Option = { id: string; label: string; detail: string; seatsLeft: number };

export function TrialForm({ options, verifyEmail = false }: { options: Option[]; verifyEmail?: boolean }) {
  const [state, action, pending] = useActionState(registerTrial, {} as TrialState);
  const err = state.fieldErrors ?? {};
  const v = state.values ?? {};
  const firstOpen = options.find((o) => o.seatsLeft > 0)?.id ?? "";
  const tracked = useRef(false);

  // Konversi iklan: Lead sekali saat kursi trial berhasil didapat.
  useEffect(() => {
    if (state.ok && !tracked.current) {
      tracked.current = true;
      trackEvent("Lead", { content_name: "Kelas trial" });
    }
  }, [state.ok]);

  if (state.ok) {
    return (
      <div className="space-y-4 rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-6">
        <h3 className="text-xl font-bold text-emerald-900">Kamu terdaftar! 🎉</h3>
        <p className="text-emerald-900">{state.ok}</p>
        <div className="flex flex-wrap gap-3">
          <Link href="/belajar" className="rounded-lg bg-emerald-700 px-5 py-3 font-semibold text-white hover:bg-emerald-800">
            Buka area belajar
          </Link>
          <Link href="/#program" className="rounded-lg border border-emerald-400 px-5 py-3 font-semibold text-emerald-900 hover:bg-white">
            Lihat program berbayar
          </Link>
        </div>
      </div>
    );
  }

  return (
    // onSubmit (bukan action=) supaya isian dan email terverifikasi tidak di-reset saat ada error.
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => action(data));
      }}
      className="space-y-4"
      noValidate
    >
      {state.error && <Notice tone="error">{state.error}</Notice>}
      <fieldset>
        <legend className="mb-2 text-sm font-medium text-stone-700">Pilih jadwal</legend>
        <div className="space-y-2">
          {options.map((o) => (
            <label
              key={o.id}
              className={`flex items-center gap-3 rounded-xl border-2 bg-white p-4 has-[:checked]:border-red-700 has-[:checked]:bg-red-50 ${o.seatsLeft > 0 ? "cursor-pointer border-stone-200" : "border-stone-100 opacity-60"}`}
            >
              <input type="radio" name="batch_id" value={o.id} defaultChecked={(v.batch_id || firstOpen) === o.id} disabled={o.seatsLeft === 0} className="h-5 w-5 accent-red-700" />
              <span>
                <span className="block font-semibold text-stone-900">{o.label}</span>
                <span className="block text-sm text-stone-600">
                  {o.detail} · {o.seatsLeft > 0 ? `sisa ${o.seatsLeft} kursi` : "penuh"}
                </span>
              </span>
            </label>
          ))}
        </div>
        {err.batch_id && <span className="mt-1 block text-sm text-red-700">{err.batch_id}</span>}
      </fieldset>
      <Field label="Nama lengkap" error={err.full_name}>
        <input name="full_name" defaultValue={v.full_name} required autoComplete="name" className={inputClass} />
      </Field>
      <Field label="Nomor WhatsApp" error={err.whatsapp}>
        <input name="whatsapp" defaultValue={v.whatsapp} required inputMode="tel" autoComplete="tel" placeholder="081234567890" className={inputClass} />
      </Field>
      {verifyEmail ? (
        <EmailWithCode defaultValue={v.email} error={err.email} />
      ) : (
        <Field label="Email (untuk login ke area belajar)" error={err.email}>
          <input name="email" defaultValue={v.email} type="email" required autoComplete="email" className={inputClass} />
        </Field>
      )}
      <button className={`${buttonClass} w-full py-3 text-lg`} disabled={pending || !firstOpen}>
        {pending ? "Memproses..." : "Daftar kelas trial gratis"}
      </button>
      <p className="text-xs text-stone-500">Data kamu hanya dipakai untuk mengirim link kelas dan info kelas Weltgakko.</p>
    </form>
  );
}
