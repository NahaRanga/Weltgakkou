import type { Metadata } from "next";
import { Suspense } from "react";
import { SignInForm } from "@/components/auth-forms";

export const metadata: Metadata = { title: "Masuk" };

export default function SignInPage({ searchParams }: PageProps<"/masuk">) {
  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="text-2xl font-bold text-stone-900">Masuk ke area belajar</h1>
      <p className="mb-6 mt-1 text-sm text-stone-600">Untuk siswa, pengajar, dan admin Weltgakkou.</p>
      <Suspense fallback={<p className="text-stone-500">Memuat...</p>}>
        <SignInWithNext searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function SignInWithNext({ searchParams }: { searchParams: PageProps<"/masuk">["searchParams"] }) {
  const next = (await searchParams).next;
  return <SignInForm next={typeof next === "string" ? next : undefined} />;
}
