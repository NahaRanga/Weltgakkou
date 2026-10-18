import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { QuizRunner } from "@/components/latihan";
import { requireDb, requireUser } from "@/lib/auth";
import { requestTime } from "@/lib/format";
import { deadlineOf, toPublic, type Attempt, type Question, type Quiz } from "@/lib/quiz";

export const metadata: Metadata = { title: "Mengerjakan tes", robots: { index: false } };

export default async function TakeQuizPage({ params }: PageProps<"/latihan/kerjakan/[attemptId]">) {
  const { attemptId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(attemptId)) notFound();
  const user = await requireUser(`/latihan/kerjakan/${attemptId}`);
  const db = requireDb();
  const { data } = await db.from("quiz_attempts").select("id, profile_id, started_at, submitted_at, quiz_id, quizzes(title, duration_minutes)").eq("id", attemptId).maybeSingle();
  const attempt = data as unknown as (Attempt & { quizzes: Pick<Quiz, "title" | "duration_minutes"> }) | null;
  if (!attempt || attempt.profile_id !== user.id) notFound();
  if (attempt.submitted_at) redirect(`/latihan/hasil/${attemptId}`);

  const { data: rows } = await db
    .from("quiz_questions")
    .select("id, section, position, prompt, image_url, audio_url, choices")
    .eq("quiz_id", attempt.quiz_id)
    .order("position");
  // Hanya soal tanpa kunci jawaban yang dikirim ke browser.
  const questions = ((rows ?? []) as Question[]).map(toPublic);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-bold text-stone-900">{attempt.quizzes.title}</h1>
      <QuizRunner attemptId={attemptId} questions={questions} deadline={deadlineOf(attempt, attempt.quizzes)} now={requestTime()} />
    </div>
  );
}
