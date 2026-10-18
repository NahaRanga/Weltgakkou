import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PracticeLoginForm } from "@/components/latihan";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Akun latihan gratis", robots: { index: false } };

export default async function PracticeAccountPage() {
  if (await getCurrentUser()) redirect("/latihan");
  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="text-2xl font-bold text-stone-900">Buat akun latihan gratis</h1>
      <p className="mb-6 mt-1 text-sm text-stone-600">
        Untuk tes penempatan, mini tryout, dan kuis kana. Sudah pernah daftar kelas? Pakai email yang sama, akunnya otomatis tersambung.
      </p>
      <PracticeLoginForm />
      <p className="mt-6 text-center text-sm text-stone-600">
        Punya password?{" "}
        <Link href="/masuk?next=/latihan" className="font-medium text-red-700 hover:underline">
          Masuk biasa
        </Link>
      </p>
    </div>
  );
}
