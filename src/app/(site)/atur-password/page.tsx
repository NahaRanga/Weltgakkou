import type { Metadata } from "next";
import { SetPasswordForm } from "@/components/auth-forms";

export const metadata: Metadata = { title: "Buat password" };

export default function SetPasswordPage() {
  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="text-2xl font-bold text-stone-900">Buat password</h1>
      <p className="mb-6 mt-1 text-sm text-stone-600">Password ini dipakai untuk masuk ke area belajar berikutnya.</p>
      <SetPasswordForm />
    </div>
  );
}
