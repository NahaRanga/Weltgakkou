import type { Metadata } from "next";
import { Suspense } from "react";
import { SignInForm } from "@/components/auth-forms";
import { Notice } from "@/components/ui/form";
import { googleLoginEnabled } from "@/lib/google-login";

export const metadata: Metadata = { title: "Masuk" };

export default function SignInPage({ searchParams }: PageProps<"/masuk">) {
  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="text-2xl font-bold text-stone-900">Masuk ke area belajar</h1>
      <p className="mb-6 mt-1 text-sm text-stone-600">Untuk siswa, pengajar, dan admin Weltgakko.</p>
      <Suspense fallback={<p className="text-stone-500">Memuat...</p>}>
        <SignInWithNext searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function SignInWithNext({ searchParams }: { searchParams: PageProps<"/masuk">["searchParams"] }) {
  const { next, google } = await searchParams;
  return (
    <>
      {google === "gagal" && (
        <div className="mb-4">
          <Notice tone="error">Masuk dengan Google gagal. Coba lagi atau pakai kode dari email.</Notice>
        </div>
      )}
      <SignInForm next={typeof next === "string" ? next : undefined} google={googleLoginEnabled()} />
    </>
  );
}
