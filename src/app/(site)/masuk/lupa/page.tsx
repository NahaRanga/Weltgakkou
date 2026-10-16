import type { Metadata } from "next";
import { ResetForm } from "@/components/auth-forms";

export const metadata: Metadata = { title: "Atur password" };

export default function ForgotPage() {
  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="text-2xl font-bold text-stone-900">Atur password</h1>
      <p className="mb-6 mt-1 text-sm text-stone-600">Kami kirim link untuk mengatur password ke email kamu.</p>
      <ResetForm />
    </div>
  );
}
