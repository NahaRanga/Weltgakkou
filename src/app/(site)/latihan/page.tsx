import type { Metadata } from "next";
import Link from "next/link";
import { BatchCta } from "@/app/(site)/latihan/batch-cta";
import { OnboardingForm, PreviewQuiz, StartButton } from "@/components/latihan";
import { getCurrentUser } from "@/lib/auth";
import { trialHref } from "@/lib/info-pages";
import { formatDate } from "@/lib/format";
import { attemptLimit, goalOptions, kindLabels, levelOptions, percent, sswOptions, tierFor, tierLabels, type Attempt, type Question, type Quiz, type Tier } from "@/lib/quiz";
import { pageMetadata } from "@/lib/seo";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const metadata: Metadata = pageMetadata({
  title: "Latihan gratis",
  description: "Tes penempatan level, mini tryout JFT-Basic, dan kuis hiragana gratis. Cukup buat akun, langsung tahu kamu cocok di kelas mana.",
  path: "/latihan",
});

// Apa yang didapat tiap tingkatan akun (winata 2026-10-18: akun yang cuma login dapat sedikit).
const perks: { tier: Tier | "tamu"; items: string[] }[] = [
  { tier: "tamu", items: ["Lihat daftar latihan", "Coba 3 soal contoh"] },
  { tier: "gratis", items: ["Tes penempatan 1×", "Mini tryout 1× (skor per bagian)", "Kuis hiragana tanpa batas"] },
  { tier: "trial", items: ["Semua isi akun gratis", "Tryout bisa diulang 1×", "Kuis katakana", "3 pembahasan soal"] },
  { tier: "siswa", items: ["Semua tes, ulang tanpa batas", "Pembahasan lengkap tiap soal", "Video kelas dan rekaman"] },
];

export default async function PracticePage() {
  const user = await getCurrentUser();
  const db = getSupabaseAdmin();
  const staff = Boolean(user && user.role !== "siswa");

  let quizzes: (Quiz & { quiz_questions: { count: number }[] })[] = [];
  if (db) {
    let query = db.from("quizzes").select("id, slug, kind, title, description, duration_minutes, published, position, quiz_questions(count)").order("position");
    if (!staff) query = query.eq("published", true);
    quizzes = ((await query).data ?? []) as typeof quizzes;
  }

  const header = (
    <section className="bg-gradient-to-b from-red-50 via-white to-white">
      <div className="mx-auto max-w-5xl px-4 pb-6 pt-12">
        <p className="text-sm font-semibold text-red-700">練習 · Latihan gratis</p>
        <h1 className="mt-1 text-3xl font-bold text-stone-900 sm:text-4xl">Cek kemampuan bahasa Jepangmu</h1>
        <p className="mt-3 max-w-2xl text-stone-700">
          Tes penempatan level, mini tryout format JFT-Basic, dan kuis kana. Hasilnya langsung memberi tahu kamu cocok mulai dari kelas mana.
        </p>
      </div>
    </section>
  );

  if (!user || !db) {
    let preview: Question[] = [];
    if (db && quizzes.length) {
      const { data } = await db
        .from("quiz_questions")
        .select("id, section, position, prompt, image_url, audio_url, choices, answer, explanation, preview")
        .in("quiz_id", quizzes.map((q) => q.id))
        .eq("preview", true)
        .order("position")
        .limit(3);
      preview = (data ?? []) as Question[];
    }
    return (
      <>
        {header}
        <div className="mx-auto max-w-5xl space-y-10 px-4 pb-16">
          <LoginCallout />
          <QuizCards quizzes={quizzes} />
          {preview.length > 0 && (
            <section>
              <h2 className="mb-1 text-xl font-bold text-stone-900">Coba {preview.length} soal contoh</h2>
              <p className="mb-4 text-sm text-stone-600">Tanpa login. Soal lainnya, skor, dan saran kelas terbuka setelah kamu buat akun gratis.</p>
              <PreviewQuiz questions={preview} />
              <div className="mt-6">
                <LoginCallout />
              </div>
            </section>
          )}
          <Perks />
        </div>
      </>
    );
  }

  const { data: profile } = await db.from("profiles").select("practice_onboarded_at").eq("id", user.id).maybeSingle();
  if (!profile?.practice_onboarded_at && !staff) {
    return (
      <>
        {header}
        <div className="mx-auto max-w-2xl px-4 pb-16">
          <div className="rounded-2xl border border-stone-200 bg-white p-6">
            <h2 className="text-xl font-bold text-stone-900">Halo {user.fullName.split(" ")[0]}, 4 pertanyaan singkat dulu</h2>
            <p className="mb-5 mt-1 text-sm text-stone-600">Cukup sekali. Jawabanmu membantu kami menyarankan kelas yang pas.</p>
            <OnboardingForm goals={goalOptions} levels={levelOptions} ssw={sswOptions} />
          </div>
        </div>
      </>
    );
  }

  const tier = await tierFor(db, user);
  const { data: attemptRows } = await db
    .from("quiz_attempts")
    .select("id, quiz_id, started_at, submitted_at, score, total")
    .eq("profile_id", user.id)
    .order("started_at", { ascending: false });
  const attempts = (attemptRows ?? []) as Attempt[];

  return (
    <>
      {header}
      <div className="mx-auto max-w-5xl space-y-10 px-4 pb-16">
        <p className="text-sm text-stone-600">
          Masuk sebagai <b className="text-stone-900">{user.fullName}</b> · <span className="rounded-full bg-stone-100 px-2 py-0.5 font-medium text-stone-800">{tierLabels[tier]}</span>
        </p>

        <section>
          <h2 className="mb-4 text-xl font-bold text-stone-900">Tes</h2>
          {quizzes.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-stone-300 p-6 text-stone-600">Soal tes sedang disiapkan tim pengajar. Sambil menunggu, coba kuis kana di bawah.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {quizzes.map((quiz) => {
                const mine = attempts.filter((a) => a.quiz_id === quiz.id);
                const done = mine.filter((a) => a.submitted_at);
                const limit = attemptLimit(tier, quiz.kind);
                const left = limit - mine.length;
                const running = mine.find((a) => !a.submitted_at);
                return (
                  <div key={quiz.id} className="flex flex-col rounded-2xl border border-stone-200 bg-white p-5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
                      {kindLabels[quiz.kind]} {!quiz.published && "· belum tampil untuk umum"}
                    </p>
                    <h3 className="mt-1 text-lg font-bold text-stone-900">{quiz.title}</h3>
                    <p className="mt-1 flex-1 text-sm text-stone-600">{quiz.description}</p>
                    <p className="mt-3 text-sm text-stone-500">
                      {quiz.quiz_questions[0]?.count ?? 0} soal · {quiz.duration_minutes} menit · {limit === Infinity ? "ulang tanpa batas" : `jatah ${limit}×, sisa ${Math.max(0, left)}`}
                    </p>
                    {done.length > 0 && (
                      <ul className="mt-2 space-y-1 text-sm">
                        {done.slice(0, 3).map((a) => (
                          <li key={a.id}>
                            <Link href={`/latihan/hasil/${a.id}`} className="text-red-700 hover:underline">
                              Skor {percent(a.score, a.total)}% · {formatDate(a.submitted_at!)}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                    <div className="mt-4">
                      {running || left > 0 ? (
                        <StartButton quizId={quiz.id} label={running ? "Lanjutkan tes" : done.length ? "Ulangi tes" : "Mulai tes"} />
                      ) : (
                        <p className="rounded-lg bg-stone-100 p-3 text-sm text-stone-700">🔒 Jatah habis. Ulang tanpa batas khusus siswa Weltgakko.</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-4 text-xl font-bold text-stone-900">Kuis kana</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <KanaCard set="hiragana" title="Hiragana あ" open />
            <KanaCard set="katakana" title="Katakana ア" open={tier !== "gratis"} />
          </div>
        </section>

        {tier === "gratis" && (
          <div className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-stone-900">Ikut kelas trial gratis, buka lebih banyak latihan</p>
              <p className="text-sm text-stone-600">Setelah hadir di kelas trial: kuis katakana, tryout bisa diulang, dan 3 pembahasan soal.</p>
            </div>
            <Link href={trialHref} className="shrink-0 rounded-lg bg-red-700 px-4 py-2.5 font-semibold text-white hover:bg-red-800">
              Daftar kelas trial
            </Link>
          </div>
        )}
        {tier !== "siswa" && <BatchCta slug="jlpt-n5" reason="Mau pembahasan lengkap dan latihan tanpa batas? Ikut kelas Weltgakko." />}
        <Perks current={tier} />
      </div>
    </>
  );
}

function LoginCallout() {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-red-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-semibold text-stone-900">Buat akun gratis untuk mulai tes</p>
        <p className="text-sm text-stone-600">Cukup nama, WhatsApp, dan email. Masuk pakai kode dari email, tanpa password.</p>
      </div>
      <div className="flex gap-2">
        <Link href="/latihan/akun" className="rounded-lg bg-red-700 px-4 py-2.5 font-semibold text-white hover:bg-red-800">
          Buat akun gratis
        </Link>
        <Link href="/masuk?next=/latihan" className="rounded-lg border border-stone-300 px-4 py-2.5 font-semibold text-stone-800 hover:bg-stone-50">
          Masuk
        </Link>
      </div>
    </div>
  );
}

function QuizCards({ quizzes }: { quizzes: (Quiz & { quiz_questions: { count: number }[] })[] }) {
  const items = [
    ...quizzes.map((q) => ({ key: q.id, kicker: kindLabels[q.kind], title: q.title, text: q.description ?? "", meta: `${q.quiz_questions[0]?.count ?? 0} soal · ${q.duration_minutes} menit` })),
    { key: "kana", kicker: "Kuis kana", title: "Hiragana dan katakana", text: "Tebak bacaan huruf, 10 soal per ronde. Kumpulkan hari beruntun.", meta: "Tanpa batas waktu" },
  ];
  return (
    <section>
      <h2 className="mb-4 text-xl font-bold text-stone-900">Yang bisa kamu coba</h2>
      <div className="grid gap-4 md:grid-cols-3">
        {items.map((i) => (
          <div key={i.key} className="rounded-2xl border border-stone-200 bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-red-700">{i.kicker}</p>
            <h3 className="mt-1 font-bold text-stone-900">{i.title}</h3>
            <p className="mt-1 text-sm text-stone-600">{i.text}</p>
            <p className="mt-3 text-sm text-stone-500">🔒 {i.meta} · perlu akun gratis</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function KanaCard({ set, title, open }: { set: string; title: string; open: boolean }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5">
      <h3 className="text-lg font-bold text-stone-900">{title}</h3>
      <p className="mt-1 text-sm text-stone-600">46 huruf dasar, 10 soal per ronde, tanpa batas.</p>
      {open ? (
        <Link href={`/latihan/kana?huruf=${set}`} className="mt-4 inline-block rounded-lg bg-red-700 px-4 py-2 font-semibold text-white hover:bg-red-800">
          Main sekarang
        </Link>
      ) : (
        <p className="mt-4 rounded-lg bg-stone-100 p-3 text-sm text-stone-700">
          🔒 Terbuka setelah ikut{" "}
          <Link href={trialHref} className="font-semibold text-red-700 hover:underline">
            kelas trial gratis
          </Link>{" "}
          atau jadi siswa.
        </p>
      )}
    </div>
  );
}

function Perks({ current }: { current?: Tier }) {
  const names = { tamu: "Tanpa akun", ...tierLabels };
  return (
    <section>
      <h2 className="mb-4 text-xl font-bold text-stone-900">Makin dekat dengan kami, makin banyak yang terbuka</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {perks.map((p) => (
          <div key={p.tier} className={`rounded-2xl border p-5 ${current === p.tier ? "border-red-700 bg-red-50" : "border-stone-200 bg-white"}`}>
            <p className="font-semibold text-stone-900">
              {names[p.tier]} {current === p.tier && <span className="text-sm font-normal text-red-700">(kamu)</span>}
            </p>
            <ul className="mt-2 space-y-1 text-sm text-stone-700">
              {p.items.map((i) => (
                <li key={i}>✓ {i}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
