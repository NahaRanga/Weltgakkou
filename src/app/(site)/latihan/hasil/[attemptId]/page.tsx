import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BatchCta } from "@/app/(site)/latihan/batch-cta";
import { ShareScore, StartButton } from "@/components/latihan";
import { requireDb, requireUser } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import {
  attemptLimit,
  explanationLimit,
  percent,
  recommendation,
  sectionLabels,
  sections,
  tierFor,
  type Attempt,
  type Question,
  type Quiz,
} from "@/lib/quiz";

export const metadata: Metadata = { title: "Hasil latihan", robots: { index: false } };

export default async function ResultPage({ params }: PageProps<"/latihan/hasil/[attemptId]">) {
  const { attemptId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(attemptId)) notFound();
  const user = await requireUser(`/latihan/hasil/${attemptId}`);
  const db = requireDb();
  const { data } = await db
    .from("quiz_attempts")
    .select("id, quiz_id, profile_id, started_at, submitted_at, score, total, section_scores, answers, quizzes(id, kind, title)")
    .eq("id", attemptId)
    .maybeSingle();
  const attempt = data as unknown as (Attempt & { quizzes: Pick<Quiz, "id" | "kind" | "title"> }) | null;
  const staff = user.role !== "siswa";
  if (!attempt || (attempt.profile_id !== user.id && !staff)) notFound();
  if (!attempt.submitted_at) redirect(`/latihan/kerjakan/${attemptId}`);

  const quiz = attempt.quizzes;
  const pct = percent(attempt.score, attempt.total);
  const rec = recommendation(quiz.kind, pct);
  const tier = await tierFor(db, user);
  const own = attempt.profile_id === user.id;

  const [{ data: rows }, { count: used }] = await Promise.all([
    db.from("quiz_questions").select("id, section, position, prompt, choices, answer, explanation").eq("quiz_id", quiz.id).order("position"),
    db.from("quiz_attempts").select("id", { count: "exact", head: true }).eq("quiz_id", quiz.id).eq("profile_id", user.id),
  ]);
  const questions = (rows ?? []) as Question[];
  const answers = attempt.answers ?? {};
  const shown = questions.slice(0, explanationLimit(tier));
  const canRetry = own && (used ?? 0) < attemptLimit(tier, quiz.kind);

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-10">
      <div>
        <Link href="/latihan" className="text-sm text-stone-600 hover:underline">
          ← Latihan gratis
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-stone-900">Hasil {quiz.title}</h1>
        <p className="text-sm text-stone-500">Dikirim {formatDateTime(attempt.submitted_at)}</p>
      </div>

      <div className="grid gap-6 rounded-2xl border border-stone-200 bg-white p-6 sm:grid-cols-[160px_1fr] sm:items-center">
        <div className="text-center">
          <p className="text-5xl font-bold text-red-700">{pct}%</p>
          <p className="mt-1 text-sm text-stone-600">
            {attempt.score} dari {attempt.total} benar
          </p>
        </div>
        <div className="space-y-3">
          {sections
            .filter((s) => attempt.section_scores?.[s])
            .map((s) => {
              const [right, all] = attempt.section_scores![s]!;
              return (
                <div key={s}>
                  <div className="flex justify-between text-sm">
                    <span className="text-stone-700">{sectionLabels[s]}</span>
                    <span className="font-semibold text-stone-900">
                      {right}/{all}
                    </span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-stone-100">
                    <div className="h-2 rounded-full bg-red-700" style={{ width: `${percent(right, all)}%` }} />
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-red-700">Saran kami</p>
        <h2 className="mt-1 text-xl font-bold text-stone-900">{rec.title}</h2>
        <p className="mt-1 text-stone-700">{rec.text}</p>
      </div>

      {tier !== "siswa" && <BatchCta slug={rec.slug} reason="Lanjutkan dengan kelas live bersama sensei." />}

      {own && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-stone-700">Bagikan hasilmu</p>
          <ShareScore text={`Aku dapat ${pct}% di ${quiz.title} Weltgakko! Berani coba?`} />
        </div>
      )}

      <section>
        <h2 className="mb-3 text-xl font-bold text-stone-900">Pembahasan</h2>
        {shown.length === 0 ? (
          <p className="rounded-2xl bg-stone-100 p-5 text-stone-700">
            🔒 Pembahasan soal khusus siswa Weltgakko. Peserta kelas trial gratis bisa melihat 3 pembahasan contoh, siswa melihat pembahasan lengkap tiap soal.
          </p>
        ) : (
          <div className="space-y-3">
            {shown.map((q, i) => {
              const mine = answers[q.id];
              const right = mine === q.answer;
              return (
                <div key={q.id} className="rounded-2xl border border-stone-200 bg-white p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                    Soal {i + 1} · {sectionLabels[q.section]}
                  </p>
                  <p className="mt-1 whitespace-pre-line text-stone-900">{q.prompt}</p>
                  <p className={`mt-2 text-sm font-medium ${right ? "text-emerald-700" : "text-red-700"}`}>
                    {right ? "✓ Benar" : `✗ Jawabanmu: ${mine === undefined ? "kosong" : q.choices[mine]}`} · Jawaban: {q.choices[q.answer]}
                  </p>
                  {q.explanation && <p className="mt-2 text-sm text-stone-700">{q.explanation}</p>}
                </div>
              );
            })}
            {shown.length < questions.length && (
              <p className="rounded-2xl bg-stone-100 p-5 text-stone-700">🔒 {questions.length - shown.length} pembahasan lainnya khusus siswa Weltgakko.</p>
            )}
          </div>
        )}
      </section>

      {canRetry && <StartButton quizId={quiz.id} label="Ulangi tes" />}
    </div>
  );
}
