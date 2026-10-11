"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordReset, setPassword, signIn, type AuthState } from "@/app/masuk/actions";
import { buttonClass, Field, inputClass, Notice } from "@/components/ui/form";

export function SignInForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(signIn, {} as AuthState);
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
        {pending ? "Masuk..." : "Masuk"}
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
