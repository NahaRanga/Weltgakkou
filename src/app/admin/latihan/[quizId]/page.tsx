import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteQuestionButton, ImportForm, QuestionForm, QuizSettingsForm } from "@/components/admin/latihan-forms";
import { Card, Empty, PageTitle } from "@/components/admin/ui";
import { requireAdmin, requireDb } from "@/lib/auth";
import { kindLabels, sectionLabels, type Question, type Quiz } from "@/lib/quiz";

export const metadata = { title: "Soal latihan" };

export default async function QuizAdminPage({ params }: PageProps<"/admin/latihan/[quizId]">) {
  const { quizId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(quizId)) notFound();
  await requireAdmin();
  const db = requireDb();
  const [quizRes, questionRes] = await Promise.all([
    db.from("quizzes").select("id, slug, kind, title, description, duration_minutes, published, position").eq("id", quizId).maybeSingle(),
    db.from("quiz_questions").select("id, section, position, prompt, image_url, audio_url, choices, answer, explanation, preview").eq("quiz_id", quizId).order("position"),
  ]);
  const quiz = quizRes.data as Quiz | null;
  if (!quiz) notFound();
  const questions = (questionRes.data ?? []) as Question[];
  const hasSamples = questions.some((q) => q.prompt.startsWith("[CONTOH]"));

  return (
    <>
      <Link href="/admin/latihan" className="text-sm text-stone-600 hover:underline">
        ← Latihan gratis
      </Link>
      <PageTitle title={quiz.title} subtitle={`${kindLabels[quiz.kind]} · ${questions.length} soal · ${quiz.duration_minutes} menit`} />

      <div className="space-y-6">
        {hasSamples && (
          <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
            Masih ada soal [CONTOH] buatan sementara. Ganti dengan soal dari tim pengajar sebelum tes ditampilkan.
          </p>
        )}
        <Card title="Pengaturan">
          <QuizSettingsForm quiz={quiz} />
        </Card>

        <Card title="Soal" count={questions.length}>
          {questions.length === 0 ? (
            <Empty>Belum ada soal.</Empty>
          ) : (
            <ol className="space-y-3">
              {questions.map((q, i) => (
                <li key={q.id} className="rounded-lg border border-stone-200 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                      {i + 1}. {sectionLabels[q.section]}
                      {q.preview && " · contoh untuk tamu"}
                      {q.image_url && " · gambar"}
                      {q.audio_url && " · audio"}
                    </p>
                    <DeleteQuestionButton questionId={q.id} />
                  </div>
                  <p className="mt-1 whitespace-pre-line text-stone-900">{q.prompt}</p>
                  <ul className="mt-1 text-sm">
                    {q.choices.map((c, j) => (
                      <li key={j} className={j === q.answer ? "font-semibold text-emerald-700" : "text-stone-600"}>
                        {String.fromCharCode(65 + j)}. {c}
                      </li>
                    ))}
                  </ul>
                  {q.explanation && <p className="mt-1 text-sm text-stone-500">Pembahasan: {q.explanation}</p>}
                </li>
              ))}
            </ol>
          )}
        </Card>

        <Card title="Tambah soal">
          <QuestionForm quizId={quiz.id} />
        </Card>

        <Card title="Impor dari CSV">
          <div className="mb-3 space-y-1 text-sm text-stone-600">
            <p>
              Baris pertama judul kolom: <code>bagian;soal;a;b;c;d;jawaban;pembahasan;gambar;audio;contoh</code>. Pemisah titik koma atau koma.
            </p>
            <p>
              bagian: kosakata, tata bahasa, percakapan, mendengar, membaca. jawaban: A–D. gambar/audio: link https:// (boleh kosong). contoh: ya untuk soal yang boleh dicoba tamu.
            </p>
            <p>Soal ditambahkan di belakang soal yang sudah ada. Tulis soal sendiri, jangan salin dari situs lain atau soal resmi (hak cipta).</p>
          </div>
          <ImportForm quizId={quiz.id} hasSamples={hasSamples} />
        </Card>
      </div>
    </>
  );
}
