"use client";

import { startTransition, useActionState, useEffect, useRef } from "react";
import Link from "next/link";
import { trackEvent } from "@/components/analytics";
import { registerTrial, type TrialState } from "@/app/(site)/trial/actions";
import { buttonClass, Field, inputClass, Notice } from "@/components/ui/form";
import { HEARD_FROM } from "@/lib/social-handle";
import { TRIAL_WA_GROUP } from "@/lib/site";

type Option = { id: string; label: string; detail: string; seatsLeft: number };

export function TrialForm({ options }: { options: Option[] }) {
  const [state, action, pending] = useActionState(registerTrial, {} as TrialState);
  const err = state.fieldErrors ?? {};
  const v = state.values ?? {};
  const firstOpen = options.find((o) => o.seatsLeft > 0)?.id ?? "";
  const tracked = useRef(false);
  // Waktu form mulai tampil, untuk cek anti-spam di server (dipasang di browser saja).
  const startedAt = useRef(0);
  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

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
        {TRIAL_WA_GROUP && (
          <div className="rounded-xl border-2 border-[#25D366] bg-white p-4">
            <p className="font-bold text-stone-900">Langkah terakhir: masuk grup WhatsApp trial</p>
            <p className="mt-1 text-sm text-stone-700">Link Zoom, pengingat jadwal, dan info kelas dibagikan di grup ini. Wajib gabung, ya!</p>
            <a
              href={TRIAL_WA_GROUP}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackEvent("Contact", { content_name: "Grup WA trial" })}
              className="mt-3 inline-block w-full rounded-lg bg-[#25D366] px-5 py-3 text-center text-lg font-bold text-white hover:bg-[#1ebe5a]"
            >
              Gabung grup WhatsApp
            </a>
          </div>
        )}
        <div className="flex flex-wrap gap-3">
          <Link href="/belajar" className="rounded-lg border border-emerald-400 px-5 py-3 font-semibold text-emerald-900 hover:bg-white">
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
    // onSubmit (bukan action=) supaya isian tidak di-reset saat ada error.
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        data.set("started_at", String(startedAt.current));
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
      <Field label="Email (untuk konfirmasi dan link kelas)" error={err.email}>
        <input name="email" defaultValue={v.email} type="email" required autoComplete="email" inputMode="email" className={inputClass} />
      </Field>
      {/* Anti-spam: kolom jebakan tersembunyi (waktu mulai isi ikut dikirim saat submit). Manusia tidak melihat/mengisinya. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
        </label>
      </div>
      <fieldset>
        <legend className="mb-2 text-sm font-medium text-stone-700">
          Tau Weltgakko dari mana? <span className="font-normal text-stone-500">(opsional)</span>
        </legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {HEARD_FROM.map((o) => (
            <label
              key={o.value}
              className="flex cursor-pointer items-center gap-2 rounded-xl border-2 border-stone-200 bg-white px-3 py-2 has-[:checked]:border-red-700 has-[:checked]:bg-red-50"
            >
              <input type="radio" name="heard_from" value={o.value} defaultChecked={v.heard_from === o.value} className="h-4 w-4 accent-red-700" />
              <span className="text-sm font-medium text-stone-800">{o.label}</span>
            </label>
          ))}
        </div>
        {err.heard_from && <span className="mt-1 block text-sm text-red-700">{err.heard_from}</span>}
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Username Instagram (opsional)" error={err.instagram}>
          <input name="instagram" defaultValue={v.instagram} autoComplete="off" autoCapitalize="none" spellCheck={false} placeholder="@namakamu" className={inputClass} />
        </Field>
        <Field label="Username TikTok (opsional)" error={err.tiktok}>
          <input name="tiktok" defaultValue={v.tiktok} autoComplete="off" autoCapitalize="none" spellCheck={false} placeholder="@namakamu" className={inputClass} />
        </Field>
      </div>
      <p className="-mt-2 text-xs text-stone-500">Boleh dikosongkan. Bisa tulis @username atau tempel link profil.</p>
      <button className={`${buttonClass} w-full py-3 text-lg`} disabled={pending || !firstOpen}>
        {pending ? "Memproses..." : "Daftar kelas trial gratis"}
      </button>
      <p className="text-xs text-stone-500">Data kamu hanya dipakai untuk mengirim link kelas dan info kelas Weltgakko. Username sosmed cuma untuk kenalan, tidak kami bagikan.</p>
    </form>
  );
}
