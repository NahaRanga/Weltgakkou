"use client";

import Link from "next/link";
import { useActionState, useEffect, useState, useTransition } from "react";
import { googleSignIn, signUpAccount, type SignUpState } from "@/app/(site)/daftar/actions";
import { withBase } from "@/lib/base-path";
import { buttonClass, Field, inputClass, Notice } from "@/components/ui/form";

type ProgramOption = { slug: string; name: string };

// Form daftar akun. Isian disimpan di state supaya tidak terhapus saat pindah ke langkah kode.
export function SignUpForm({ programs, google }: { programs: ProgramOption[]; google: boolean }) {
  const [state, action, pending] = useActionState(signUpAccount, {} as SignUpState);
  const [v, setV] = useState({ full_name: "", whatsapp: "", email: "", password: "", program: "" });
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setV({ ...v, [k]: e.target.value });
  const codeStep = state.step === "code";

  useEffect(() => {
    if (state.redirectTo) window.location.assign(withBase(state.redirectTo));
  }, [state.redirectTo]);

  return (
    <div className="space-y-5">
      {google && (
        <>
          <GoogleButton next="/belajar" label="Daftar dengan Google" />
          <div className="flex items-center gap-3 text-xs text-stone-400">
            <span className="h-px flex-1 bg-stone-200" />
            atau pakai email
            <span className="h-px flex-1 bg-stone-200" />
          </div>
        </>
      )}
      <form action={action} className="space-y-4">
        {state.error && <Notice tone="error">{state.error}</Notice>}
        <fieldset disabled={codeStep} className="space-y-4 disabled:opacity-70">
          <Field label="Nama lengkap">
            <input name="full_name" required autoComplete="name" value={v.full_name} onChange={set("full_name")} className={inputClass} />
          </Field>
          <Field label="Nomor WhatsApp">
            <input name="whatsapp" required inputMode="tel" autoComplete="tel" placeholder="081234567890" value={v.whatsapp} onChange={set("whatsapp")} className={inputClass} />
          </Field>
          <Field label="Email (Gmail atau lainnya)">
            <input name="email" type="email" required autoComplete="email" value={v.email} onChange={set("email")} className={inputClass} />
          </Field>
          <Field label="Buat password (minimal 8 karakter)">
            <input name="password" type="password" required minLength={8} autoComplete="new-password" value={v.password} onChange={set("password")} className={inputClass} />
          </Field>
          <Field label="Program yang kamu minati">
            <select name="program" value={v.program} onChange={set("program")} className={inputClass}>
              <option value="">Belum tahu, mau lihat-lihat dulu</option>
              {programs.map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
        </fieldset>
        {/* Fieldset nonaktif tidak ikut terkirim, jadi isian dikirim ulang lewat input tersembunyi. */}
        {codeStep && Object.entries(v).map(([k, val]) => <input key={k} type="hidden" name={k} value={val} />)}
        {codeStep && (
          <>
            <Notice tone="ok">Kode 6 angka sudah dikirim ke {v.email}. Cek juga folder Spam/Promosi.</Notice>
            <Field label="Kode dari email">
              <input
                name="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9 ]{6,7}"
                maxLength={7}
                required
                autoFocus
                className={`${inputClass} tracking-[0.4em]`}
              />
            </Field>
          </>
        )}
        <button className={`${buttonClass} w-full`} disabled={pending || Boolean(state.redirectTo)}>
          {pending || state.redirectTo ? "Memproses..." : codeStep ? "Buat akun" : "Kirim kode verifikasi"}
        </button>
        {codeStep && (
          <button type="button" onClick={() => window.location.reload()} className="block w-full text-center text-sm text-stone-600 hover:text-stone-900">
            Ubah data atau minta kode baru
          </button>
        )}
        <p className="text-center text-xs text-stone-500">
          Dengan mendaftar kamu setuju dengan{" "}
          <Link href="/refund" className="underline hover:text-stone-800">
            kebijakan refund
          </Link>{" "}
          Weltgakko.
        </p>
      </form>
      <p className="text-center text-sm text-stone-600">
        Sudah punya akun?{" "}
        <Link href="/masuk" className="font-medium text-red-700 hover:underline">
          Masuk
        </Link>
      </p>
    </div>
  );
}

export function GoogleButton({ next, label = "Masuk dengan Google" }: { next: string; label?: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();
  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await googleSignIn(next);
            if (res.url) window.location.assign(res.url);
            else setError(res.error);
          })
        }
        className="flex w-full items-center justify-center gap-3 rounded-lg border border-stone-300 bg-white px-4 py-2.5 font-semibold text-stone-800 hover:bg-stone-50 disabled:opacity-60"
      >
        <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden>
          <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
          <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
          <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
          <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
        </svg>
        {pending ? "Membuka Google..." : label}
      </button>
      {error && <Notice tone="error">{error}</Notice>}
    </div>
  );
}
