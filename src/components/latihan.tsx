"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { practiceLogin, saveOnboarding, startAttempt, submitAttempt, type ActionResult, type LoginState } from "@/app/(site)/latihan/actions";
import { buttonClass, Field, inputClass, Notice } from "@/components/ui/form";
import { withBase } from "@/lib/base-path";
import { kana, type KanaSet } from "@/lib/kana";
import { sectionLabels, type Section } from "@/lib/quiz";

// Komponen browser zona latihan (/latihan). Kunci jawaban tes tidak pernah dikirim ke sini,
// kecuali soal contoh untuk tamu.

export function PracticeLoginForm() {
  const [state, action, pending] = useActionState(practiceLogin, {} as LoginState);
  useEffect(() => {
    // Muat ulang penuh supaya cookie sesi yang baru dipasang ikut terkirim.
    if (state.redirectTo) window.location.assign(withBase(state.redirectTo));
  }, [state.redirectTo]);
  const codeStep = state.step === "code";
  return (
    <form action={action} className="space-y-4">
      {state.error && <Notice tone="error">{state.error}</Notice>}
      {codeStep && !state.error && <Notice tone="ok">Kode 6 digit sudah dikirim ke {state.email}. Cek juga folder Spam/Promosi.</Notice>}
      <Field label="Nama lengkap">
        <input name="full_name" required defaultValue={state.full_name} readOnly={codeStep} autoComplete="name" className={inputClass} />
      </Field>
      <Field label="Nomor WhatsApp">
        <input name="whatsapp" required inputMode="tel" defaultValue={state.whatsapp} readOnly={codeStep} placeholder="081234567890" autoComplete="tel" className={inputClass} />
      </Field>
      <Field label="Email (Gmail juga bisa)">
        <input name="email" type="email" required defaultValue={state.email} readOnly={codeStep} autoComplete="email" className={inputClass} />
      </Field>
      {codeStep && (
        <Field label="Kode dari email">
          <input name="code" required inputMode="numeric" pattern="\d{6}" maxLength={6} autoComplete="one-time-code" autoFocus className={`${inputClass} tracking-[0.4em]`} />
        </Field>
      )}
      <button className={`${buttonClass} w-full`} disabled={pending || Boolean(state.redirectTo)}>
        {pending || state.redirectTo ? "Memproses..." : codeStep ? "Masuk dan mulai latihan" : "Kirim kode ke email"}
      </button>
      {codeStep && (
        <button type="button" onClick={() => window.location.reload()} className="block w-full text-center text-sm text-stone-600 hover:text-stone-900">
          Salah email? Ulangi dari awal
        </button>
      )}
    </form>
  );
}

export function OnboardingForm({ goals, levels, ssw }: { goals: string[]; levels: string[]; ssw: string[] }) {
  const [state, action, pending] = useActionState(saveOnboarding, {} as ActionResult);
  const select = (name: string, label: string, options: string[]) => (
    <Field label={label}>
      <select name={name} required defaultValue="" className={inputClass}>
        <option value="" disabled>
          Pilih...
        </option>
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </Field>
  );
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      {state.error && (
        <div className="sm:col-span-2">
          <Notice tone="error">{state.error}</Notice>
        </div>
      )}
      {select("learning_goal", "Tujuan belajar bahasa Jepang", goals)}
      {select("prior_level", "Kemampuan kamu sekarang", levels)}
      {select("ssw_field", "Bidang kerja SSW yang diminati", ssw)}
      <Field label="Pernah ke Jepang?">
        <select name="been_to_japan" required defaultValue="" className={inputClass}>
          <option value="" disabled>
            Pilih...
          </option>
          <option value="tidak">Belum pernah</option>
          <option value="ya">Pernah</option>
        </select>
      </Field>
      <button className={`${buttonClass} sm:col-span-2`} disabled={pending}>
        {pending ? "Menyimpan..." : "Simpan dan buka latihan"}
      </button>
    </form>
  );
}

export function StartButton({ quizId, label }: { quizId: string; label: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();
  return (
    <div className="space-y-2">
      {error && <Notice tone="error">{error}</Notice>}
      <button
        className={buttonClass}
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await startAttempt(quizId);
            if (res.redirectTo) router.push(res.redirectTo);
            else setError(res.error);
          })
        }
      >
        {pending ? "Menyiapkan soal..." : label}
      </button>
    </div>
  );
}

type RunnerQuestion = { id: string; section: string; prompt: string; image_url: string | null; audio_url: string | null; choices: string[] };

function QuestionView({ q, chosen, onChoose, number }: { q: RunnerQuestion; chosen?: number; onChoose: (i: number) => void; number: number }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
        Soal {number} · {sectionLabels[q.section as Section] ?? q.section}
      </p>
      <p className="mt-2 whitespace-pre-line text-lg leading-relaxed text-stone-900">{q.prompt}</p>
      {q.image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={q.image_url} alt="" className="mt-3 max-h-72 rounded-lg border border-stone-200" />
      )}
      {q.audio_url && <audio controls src={q.audio_url} className="mt-3 w-full" preload="none" />}
      <div className="mt-4 grid gap-2">
        {q.choices.map((c, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onChoose(i)}
            className={`rounded-xl border px-4 py-3 text-left transition ${
              chosen === i ? "border-red-700 bg-red-50 font-semibold text-red-800" : "border-stone-300 bg-white text-stone-800 hover:border-stone-400"
            }`}
          >
            <span className="mr-2 text-stone-500">{String.fromCharCode(65 + i)}.</span>
            {c}
          </button>
        ))}
      </div>
    </div>
  );
}

export function QuizRunner({ attemptId, questions, deadline, now }: { attemptId: string; questions: RunnerQuestion[]; deadline: number; now: number }) {
  const router = useRouter();
  const storageKey = `wg-latihan-${attemptId}`;
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [index, setIndex] = useState(0);
  const [left, setLeft] = useState(Math.max(0, deadline - now));
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();
  const sent = useRef(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved) setAnswers(JSON.parse(saved));
    } catch {}
  }, [storageKey]);

  function choose(id: string, i: number) {
    setAnswers((prev) => {
      const next = { ...prev, [id]: i };
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {}
      return next;
    });
  }

  function send(force = false) {
    if (sent.current && !force) return;
    sent.current = true;
    start(async () => {
      const res = await submitAttempt(attemptId, answers);
      if (res.redirectTo) {
        try {
          localStorage.removeItem(storageKey);
        } catch {}
        router.replace(res.redirectTo);
      } else {
        sent.current = false;
        setError(res.error);
      }
    });
  }

  const sendRef = useRef(send);
  useEffect(() => {
    sendRef.current = send;
  });
  useEffect(() => {
    // Selisih jam browser dengan server, supaya timer tidak bisa diakali dengan mengubah jam HP.
    const offset = now - Date.now();
    const t = setInterval(() => {
      const ms = Math.max(0, deadline - (Date.now() + offset));
      setLeft(ms);
      if (ms === 0) {
        clearInterval(t);
        sendRef.current();
      }
    }, 1000);
    return () => clearInterval(t);
  }, [deadline, now]);

  const q = questions[index];
  const answered = Object.keys(answers).filter((id) => questions.some((x) => x.id === id)).length;
  const mm = Math.floor(left / 60000);
  const ss = Math.floor((left % 60000) / 1000);

  return (
    <div className="space-y-6">
      <div className="sticky top-16 z-10 flex items-center justify-between rounded-xl border border-stone-200 bg-white/95 px-4 py-3 backdrop-blur">
        <p className="text-sm text-stone-600">
          Terjawab <b className="text-stone-900">{answered}</b> dari {questions.length}
        </p>
        <p className={`font-mono text-lg font-bold ${left < 60_000 ? "text-red-700" : "text-stone-900"}`} aria-label="Sisa waktu">
          {String(mm).padStart(2, "0")}:{String(ss).padStart(2, "0")}
        </p>
      </div>

      {error && <Notice tone="error">{error}</Notice>}
      {left === 0 && pending && <Notice tone="info">Waktu habis, jawabanmu sedang dikirim...</Notice>}

      {q && (
        <div className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-6">
          <QuestionView q={q} number={index + 1} chosen={answers[q.id]} onChoose={(i) => choose(q.id, i)} />
          <div className="mt-6 flex justify-between gap-2">
            <button type="button" onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0} className="rounded-lg border border-stone-300 px-4 py-2 font-medium text-stone-700 disabled:opacity-40">
              ← Sebelumnya
            </button>
            {index < questions.length - 1 ? (
              <button type="button" onClick={() => setIndex((i) => i + 1)} className="rounded-lg border border-stone-300 px-4 py-2 font-medium text-stone-700">
                Berikutnya →
              </button>
            ) : (
              <button type="button" onClick={() => send(true)} disabled={pending} className={buttonClass}>
                {pending ? "Mengirim..." : "Kirim jawaban"}
              </button>
            )}
          </div>
        </div>
      )}

      <div>
        <p className="mb-2 text-sm font-medium text-stone-700">Lompat ke soal</p>
        <div className="flex flex-wrap gap-2">
          {questions.map((x, i) => (
            <button
              key={x.id}
              type="button"
              onClick={() => setIndex(i)}
              className={`h-10 w-10 rounded-lg border text-sm font-semibold ${
                i === index ? "border-red-700 text-red-700" : answers[x.id] !== undefined ? "border-stone-800 bg-stone-800 text-white" : "border-stone-300 bg-white text-stone-600"
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>

      <button type="button" onClick={() => send(true)} disabled={pending} className="text-sm font-medium text-stone-600 underline hover:text-stone-900">
        Selesai sekarang dan kirim jawaban
      </button>
    </div>
  );
}

type PreviewQuestion = RunnerQuestion & { answer: number; explanation: string | null };

// Soal contoh untuk tamu: dicek langsung di browser.
export function PreviewQuiz({ questions }: { questions: PreviewQuestion[] }) {
  const [chosen, setChosen] = useState<Record<string, number>>({});
  return (
    <div className="space-y-4">
      {questions.map((q, i) => {
        const pick = chosen[q.id];
        return (
          <div key={q.id} className="rounded-2xl border border-stone-200 bg-white p-5">
            <QuestionView q={q} number={i + 1} chosen={pick} onChoose={(c) => setChosen((p) => (p[q.id] === undefined ? { ...p, [q.id]: c } : p))} />
            {pick !== undefined && (
              <p className={`mt-3 rounded-lg p-3 text-sm ${pick === q.answer ? "bg-emerald-50 text-emerald-900" : "bg-red-50 text-red-800"}`}>
                {pick === q.answer ? "Benar! " : `Kurang tepat. Jawabannya ${String.fromCharCode(65 + q.answer)}. `}
                {q.explanation}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function ShareScore({ text }: { text: string }) {
  const url = "https://weltgakko.com/latihan";
  const full = `${text}\nCoba juga gratis: ${url}`;
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex flex-wrap gap-2">
      <a href={`https://wa.me/?text=${encodeURIComponent(full)}`} target="_blank" rel="noreferrer" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
        Bagikan ke WhatsApp
      </a>
      <button
        type="button"
        onClick={async () => {
          try {
            if (navigator.share) await navigator.share({ text, url });
            else {
              await navigator.clipboard.writeText(full);
              setCopied(true);
            }
          } catch {}
        }}
        className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-800 hover:bg-stone-50"
      >
        {copied ? "Teks disalin" : "Bagikan ke IG / lainnya"}
      </button>
    </div>
  );
}

const ROUND = 10;

function shuffle<T>(arr: T[]) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function makeRound(set: KanaSet) {
  const all = kana[set];
  return shuffle(all)
    .slice(0, ROUND)
    .map((k) => ({ ...k, choices: shuffle([k.romaji, ...shuffle(all.filter((x) => x.romaji !== k.romaji)).slice(0, 3).map((x) => x.romaji)]) }));
}

type KanaStats = { best: number; streak: number; last: string };
const dayWib = (ms: number) => new Date(ms).toLocaleDateString("sv-SE", { timeZone: "Asia/Jakarta" });

// Hari beruntun: naik bila kemarin juga main, tetap bila hari ini sudah main, selain itu mulai dari 1.
function nextStats(stats: KanaStats, final: number): KanaStats {
  const d = dayWib(Date.now());
  const yesterday = dayWib(Date.now() - 86_400_000);
  const streak = stats.last === d ? stats.streak : stats.last === yesterday ? stats.streak + 1 : 1;
  return { best: Math.max(stats.best, final), streak, last: d };
}

// Kuis kana tanpa batas. Skor terbaik dan hari beruntun disimpan di browser saja.
export function KanaQuiz({ set }: { set: KanaSet }) {
  const key = `wg-kana-${set}`;
  const [round, setRound] = useState<ReturnType<typeof makeRound> | null>(null);
  const [i, setI] = useState(0);
  const [score, setScore] = useState(0);
  const [pick, setPick] = useState<string | null>(null);
  const [stats, setStats] = useState<KanaStats>({ best: 0, streak: 0, last: "" });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(key);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved) setStats(JSON.parse(saved));
    } catch {}
    setRound(makeRound(set));
  }, [key, set]);

  const done = round !== null && i >= round.length;
  const card = round?.[i];

  function finish(final: number) {
    const next = nextStats(stats, final);
    setStats(next);
    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch {}
  }

  function answer(r: string) {
    if (pick || !card || !round) return;
    setPick(r);
    const gained = r === card.romaji ? 1 : 0;
    setScore((s) => s + gained);
    setTimeout(() => {
      setPick(null);
      setI((n) => n + 1);
      if (i + 1 >= round.length) finish(score + gained);
    }, 700);
  }

  const summary = useMemo(() => `Skor terbaik ${stats.best}/${ROUND} · ${stats.streak} hari beruntun`, [stats]);

  if (!round) return <p className="text-stone-500">Memuat...</p>;
  return (
    <div className="mx-auto max-w-md space-y-4 text-center">
      <p className="text-sm text-stone-600">{summary}</p>
      {done ? (
        <div className="rounded-2xl border border-stone-200 bg-white p-6">
          <p className="text-4xl font-bold text-stone-900">
            {score}/{ROUND}
          </p>
          <p className="mt-2 text-stone-600">{score === ROUND ? "Sempurna! Besok balik lagi biar hari beruntunmu nambah." : "Ulangi sampai semuanya benar."}</p>
          <button
            className={`${buttonClass} mt-4`}
            onClick={() => {
              setRound(makeRound(set));
              setI(0);
              setScore(0);
            }}
          >
            Main lagi
          </button>
        </div>
      ) : (
        card && (
          <div className="rounded-2xl border border-stone-200 bg-white p-6">
            <p className="text-sm text-stone-500">
              {i + 1} / {ROUND}
            </p>
            <p className="my-4 text-8xl font-bold text-stone-900" lang="ja">
              {card.char}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {card.choices.map((c) => (
                <button
                  key={c}
                  onClick={() => answer(c)}
                  className={`rounded-xl border px-4 py-3 text-lg font-semibold ${
                    pick && c === card.romaji ? "border-emerald-600 bg-emerald-50 text-emerald-800" : pick === c ? "border-red-700 bg-red-50 text-red-800" : "border-stone-300 bg-white text-stone-800 hover:border-stone-400"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        )
      )}
    </div>
  );
}
