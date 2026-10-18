"use client";

import Link from "next/link";
import { useActionState, useEffect, useState, useTransition } from "react";
import { requestPasswordReset, setPassword, signIn, signInWithCode, signOut, type AuthState, type CodeState } from "@/app/(site)/masuk/actions";
import { withBase } from "@/lib/base-path";
import { GoogleButton } from "@/components/signup-form";
import { buttonClass, Field, inputClass, Notice } from "@/components/ui/form";

// Muat ulang penuh ke halaman tujuan supaya cookie sesi yang baru dipasang ikut terkirim.
function useHardRedirect(to?: string) {
  useEffect(() => {
    if (to) window.location.assign(withBase(to));
  }, [to]);
}

// Dua cara masuk: kode 6 digit dari email (default, siswa baru belum punya password) atau password.
export function SignInForm({ next, google }: { next?: string; google?: boolean }) {
  const [mode, setMode] = useState<"kode" | "password">("kode");
  const tab = (value: typeof mode, label: string) => (
    <button
      type="button"
      onClick={() => setMode(value)}
      className={`flex-1 rounded-md px-3 py-2 text-sm font-medium ${mode === value ? "bg-white text-stone-900 shadow-sm" : "text-stone-600 hover:text-stone-900"}`}
    >
      {label}
    </button>
  );
  return (
    <div className="space-y-5">
      {google && <GoogleButton next={next ?? "/belajar"} />}
      <div className="flex gap-1 rounded-lg bg-stone-100 p-1">
        {tab("kode", "Kode dari email")}
        {tab("password", "Password")}
      </div>
      {mode === "kode" ? <CodeSignInForm next={next} /> : <PasswordSignInForm next={next} />}
    </div>
  );
}

function CodeSignInForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(signInWithCode, {} as CodeState);
  useHardRedirect(state.redirectTo);
  const codeStep = state.step === "code";
  return (
    <form action={action} className="space-y-4">
      {state.error && <Notice tone="error">{state.error}</Notice>}
      <input type="hidden" name="next" value={next ?? "/belajar"} />
      <Field label="Email yang dipakai saat mendaftar">
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          defaultValue={state.email}
          readOnly={codeStep}
          className={`${inputClass} ${codeStep ? "bg-stone-50 text-stone-600" : ""}`}
        />
      </Field>
      {codeStep && (
        <>
          <Notice tone="ok">Kalau email ini terdaftar, kode 6 angka sudah kami kirim. Cek juga folder Spam/Promosi.</Notice>
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
      <button className={`${buttonClass} w-full`} disabled={pending}>
        {pending || state.redirectTo ? "Memproses..." : codeStep ? "Masuk" : "Kirim kode"}
      </button>
      {codeStep && (
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="block w-full text-center text-sm text-stone-600 hover:text-stone-900"
        >
          Ganti email atau minta kode baru
        </button>
      )}
      <p className="text-center text-xs text-stone-500">
        Belum punya akun?{" "}
        <Link href="/daftar" className="font-medium text-red-700 hover:underline">
          Daftar gratis
        </Link>
      </p>
    </form>
  );
}

function PasswordSignInForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(signIn, {} as AuthState);
  useHardRedirect(state.redirectTo);
  return (
    <form action={action} className="space-y-4">
      {state.error && <Notice tone="error">{state.error}</Notice>}
      <input type="hidden" name="next" value={next ?? "/belajar"} />
      <Field label="Email">
        <input name="email" type="email" required autoComplete="email" className={inputClass} />
      </Field>
      <Field label="Password">
        <input name="password" type="password" required autoComplete="current-password" className={inputClass} />
      </Field>
      <button className={`${buttonClass} w-full`} disabled={pending}>
        {pending || state.redirectTo ? "Masuk..." : "Masuk"}
      </button>
      <Link href="/masuk/lupa" className="block text-center text-sm text-stone-600 hover:text-stone-900">
        Lupa password atau belum pernah mengatur password?
      </Link>
    </form>
  );
}

export function ResetForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, {} as AuthState);
  if (state.ok) return <Notice tone="ok">{state.ok}</Notice>;
  return (
    <form action={action} className="space-y-4">
      {state.error && <Notice tone="error">{state.error}</Notice>}
      <Field label="Email yang dipakai saat mendaftar">
        <input name="email" type="email" required autoComplete="email" className={inputClass} />
      </Field>
      <button className={`${buttonClass} w-full`} disabled={pending}>
        {pending ? "Mengirim..." : "Kirim link"}
      </button>
    </form>
  );
}

export function SetPasswordForm() {
  const [state, action, pending] = useActionState(setPassword, {} as AuthState);
  useHardRedirect(state.redirectTo);
  return (
    <form action={action} className="space-y-4">
      {state.error && <Notice tone="error">{state.error}</Notice>}
      <Field label="Password baru (minimal 8 karakter)">
        <input name="password" type="password" required minLength={8} autoComplete="new-password" className={inputClass} />
      </Field>
      <Field label="Ulangi password">
        <input name="confirm" type="password" required minLength={8} autoComplete="new-password" className={inputClass} />
      </Field>
      <button className={`${buttonClass} w-full`} disabled={pending}>
        {pending ? "Menyimpan..." : "Simpan dan mulai belajar"}
      </button>
    </form>
  );
}

export function SignOutButton() {
  const [pending, start] = useTransition();
  return (
    <button
      onClick={() =>
        start(async () => {
          await signOut();
          window.location.assign(withBase("/"));
        })
      }
      disabled={pending}
      className="text-stone-600 hover:text-stone-900"
    >
      Keluar
    </button>
  );
}
