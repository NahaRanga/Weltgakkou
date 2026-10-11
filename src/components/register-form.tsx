"use client";

import { useActionState } from "react";
import { register, type RegisterState } from "@/app/daftar/[batchId]/actions";
import { buttonClass, Field, inputClass, Notice } from "@/components/ui/form";

export function RegisterForm({
  batchId,
  monthlyLabel,
  upfrontLabel,
}: {
  batchId: string;
  monthlyLabel?: string;
  upfrontLabel?: string;
}) {
  const [state, action, pending] = useActionState(register.bind(null, batchId), {} as RegisterState);
  const err = state.fieldErrors ?? {};
  const v = state.values ?? {};
  const defaultPlan = v.plan || (upfrontLabel ? "lunas" : "bulanan");

  return (
    <form action={action} className="space-y-4" noValidate>
      {state.error && <Notice tone="error">{state.error}</Notice>}
      <Field label="Nama lengkap" error={err.full_name}>
        <input name="full_name" defaultValue={v.full_name} required autoComplete="name" className={inputClass} />
      </Field>
      <Field label="Nomor WhatsApp" error={err.whatsapp}>
        <input name="whatsapp" defaultValue={v.whatsapp} required inputMode="tel" autoComplete="tel" placeholder="081234567890" className={inputClass} />
      </Field>
      <Field label="Email (untuk login ke area belajar)" error={err.email}>
        <input name="email" defaultValue={v.email} type="email" required autoComplete="email" className={inputClass} />
      </Field>

      <fieldset>
        <legend className="mb-1 text-sm font-medium text-stone-700">Cara bayar</legend>
        <div className="space-y-2">
          {upfrontLabel && (
            <label className="flex items-center gap-3 rounded-lg border border-stone-300 bg-white p-3">
              <input type="radio" name="plan" value="lunas" defaultChecked={defaultPlan === "lunas"} />
              <span>
                <span className="font-medium text-stone-900">Sekali bayar</span>{" "}
                <span className="text-stone-600">{upfrontLabel}</span>
              </span>
            </label>
          )}
          {monthlyLabel && (
            <label className="flex items-center gap-3 rounded-lg border border-stone-300 bg-white p-3">
              <input type="radio" name="plan" value="bulanan" defaultChecked={defaultPlan === "bulanan"} />
              <span>
                <span className="font-medium text-stone-900">Per bulan</span>{" "}
                <span className="text-stone-600">{monthlyLabel}</span>
              </span>
            </label>
          )}
        </div>
        {err.plan && <span className="mt-1 block text-sm text-red-700">{err.plan}</span>}
      </fieldset>

      <Field label="Kode referral (opsional)">
        <input name="referral_code" defaultValue={v.referral_code} className={inputClass} />
      </Field>

      <button className={`${buttonClass} w-full py-3`} disabled={pending}>
        {pending ? "Memproses..." : "Daftar dan lanjut ke pembayaran"}
      </button>
      <p className="text-xs text-stone-500">Tagihan berlaku 24 jam. Kursi di batch disimpan selama tagihan belum kedaluwarsa.</p>
    </form>
  );
}
