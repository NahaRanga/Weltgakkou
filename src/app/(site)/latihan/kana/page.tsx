import type { Metadata } from "next";
import Link from "next/link";
import { KanaQuiz } from "@/components/latihan";
import { requireDb, requireUser } from "@/lib/auth";
import { kanaLabels, type KanaSet } from "@/lib/kana";
import { tierFor } from "@/lib/quiz";

export const metadata: Metadata = { title: "Kuis kana", robots: { index: false } };

export default async function KanaPage({ searchParams }: PageProps<"/latihan/kana">) {
  const set: KanaSet = (await searchParams).huruf === "katakana" ? "katakana" : "hiragana";
  const user = await requireUser(`/latihan/kana?huruf=${set}`);
  // Katakana untuk peserta kelas trial dan siswa (tingkatan akses P13).
  const locked = set === "katakana" && (await tierFor(requireDb(), user)) === "gratis";
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <Link href="/latihan" className="text-sm text-stone-600 hover:underline">
        ← Latihan gratis
      </Link>
      <h1 className="mb-6 mt-2 text-center text-3xl font-bold text-stone-900">Kuis {kanaLabels[set]}</h1>
      {locked ? (
        <p className="mx-auto max-w-md rounded-2xl bg-stone-100 p-6 text-center text-stone-700">
          🔒 Kuis katakana terbuka setelah kamu ikut kelas trial gratis atau jadi siswa Weltgakko. Sementara itu, kuasai{" "}
          <Link href="/latihan/kana?huruf=hiragana" className="font-semibold text-red-700 hover:underline">
            hiragana
          </Link>{" "}
          dulu.
        </p>
      ) : (
        <KanaQuiz set={set} />
      )}
    </div>
  );
}
