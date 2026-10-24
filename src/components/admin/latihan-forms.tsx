"use client";

import { useActionState, useTransition } from "react";
import { addQuestion, createQuiz, deleteQuestion, importQuestions, setTrialAttended, updateQuiz } from "@/app/admin/latihan/actions";
import type { FormState } from "@/app/admin/types";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { smallButton } from "@/components/admin/ui";
import { buttonClass, Field, inputClass, Notice } from "@/components/ui/form";
import { sectionLabels, sections } from "@/lib/quiz";

// Form admin zona latihan (/admin/latihan).

function Messages({ state }: { state: FormState }) {
  return (
    <>
      {state.error && <Notice tone="error">{state.error}</Notice>}
      {state.ok && <Notice tone="ok">{state.ok}</Notice>}
    </>
  );
}

export function CreateQuizForm() {
  const [state, action, pending] = useActionState(createQuiz, {} as FormState);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Messages state={state} />
      </div>
      <Field label="Judul">
        <input name="title" required placeholder="Mini tryout JFT-Basic 2" className={inputClass} />
      </Field>
      <Field label="Slug (alamat /latihan/...)">
        <input name="slug" required pattern="[a-z0-9\-]{3,40}" placeholder="mini-tryout-jft-2" className={inputClass} />
      </Field>
      <Field label="Jenis">
        <select name="kind" className={inputClass}>
          <option value="tryout">Mini tryout</option>
          <option value="penempatan">Tes penempatan</option>
        </select>
      </Field>
      <Field label="Durasi (menit)">
        <input name="duration_minutes" type="number" min={1} max={180} defaultValue={20} required className={inputClass} />
      </Field>
      <div className="sm:col-span-2">
        <Field label="Keterangan singkat">
          <input name="description" maxLength={300} className={inputClass} />
        </Field>
      </div>
      <button className={`${buttonClass} sm:col-span-2 sm:justify-self-start`} disabled={pending}>
        {pending ? "Menyimpan..." : "Buat tes"}
      </button>
    </form>
  );
}

export function QuizSettingsForm({ quiz }: { quiz: { id: string; title: string; description: string | null; duration_minutes: number; published: boolean } }) {
  const [state, action, pending] = useActionState(updateQuiz.bind(null, quiz.id), {} as FormState);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-[1fr_140px]">
      <div className="sm:col-span-2">
        <Messages state={state} />
      </div>
      <Field label="Judul">
        <input name="title" required defaultValue={quiz.title} className={inputClass} />
      </Field>
      <Field label="Durasi (menit)">
        <input name="duration_minutes" type="number" min={1} max={180} defaultValue={quiz.duration_minutes} required className={inputClass} />
      </Field>
      <div className="sm:col-span-2">
        <Field label="Keterangan singkat">
          <input name="description" maxLength={300} defaultValue={quiz.description ?? ""} className={inputClass} />
        </Field>
      </div>
      <label className="flex items-center gap-2 text-sm text-stone-700 sm:col-span-2">
        <input type="checkbox" name="published" value="1" defaultChecked={quiz.published} />
        Tampilkan di /latihan untuk pengunjung
      </label>
      <button className={`${buttonClass} sm:justify-self-start`} disabled={pending}>
        {pending ? "Menyimpan..." : "Simpan"}
      </button>
    </form>
  );
}

export function QuestionForm({ quizId }: { quizId: string }) {
  const [state, action, pending] = useActionState(addQuestion.bind(null, quizId), {} as FormState);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Messages state={state} />
      </div>
      <Field label="Bagian">
        <select name="bagian" className={inputClass}>
          {sections.map((s) => (
            <option key={s} value={s}>
              {sectionLabels[s]}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Jawaban benar">
        <select name="jawaban" className={inputClass}>
          {"ABCD".split("").map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </Field>
      <div className="sm:col-span-2">
        <Field label="Soal">
          <textarea name="soal" required rows={3} className={inputClass} />
        </Field>
      </div>
      {"abcd".split("").map((c) => (
        <Field key={c} label={`Pilihan ${c.toUpperCase()}${c > "b" ? " (opsional)" : ""}`}>
          <input name={c} required={c <= "b"} className={inputClass} />
        </Field>
      ))}
      <div className="sm:col-span-2">
        <Field label="Pembahasan (hanya terlihat siswa)">
          <textarea name="pembahasan" rows={2} className={inputClass} />
        </Field>
      </div>
      <Field label="Link gambar https:// (opsional)">
        <input name="gambar" type="url" className={inputClass} />
      </Field>
      <Field label="Link audio https:// (opsional, untuk Mendengar)">
        <input name="audio" type="url" className={inputClass} />
      </Field>
      <label className="flex items-center gap-2 text-sm text-stone-700 sm:col-span-2">
        <input type="checkbox" name="contoh" value="1" />
        Soal contoh untuk tamu (tanpa login, jawaban dan pembahasan langsung terlihat)
      </label>
      <button className={`${buttonClass} sm:justify-self-start`} disabled={pending}>
        {pending ? "Menyimpan..." : "Tambah soal"}
      </button>
    </form>
  );
}

export function ImportForm({ quizId, hasSamples }: { quizId: string; hasSamples: boolean }) {
  const [state, action, pending] = useActionState(importQuestions.bind(null, quizId), {} as FormState);
  return (
    <form action={action} className="space-y-3">
      <Messages state={state} />
      <Field label="File CSV (dari Excel / Google Sheets)">
        <input name="file" type="file" accept=".csv,text/csv" className="block text-sm" />
      </Field>
      <Field label="Atau tempel isi CSV di sini">
        <textarea name="text" rows={4} placeholder="bagian;soal;a;b;c;d;jawaban;pembahasan;gambar;audio;contoh" className={`${inputClass} font-mono text-xs`} />
      </Field>
      {hasSamples && (
        <label className="flex items-center gap-2 text-sm text-stone-700">
          <input type="checkbox" name="replace_samples" value="1" defaultChecked />
          Hapus soal [CONTOH] bawaan dulu
        </label>
      )}
      <button className={buttonClass} disabled={pending}>
        {pending ? "Mengimpor..." : "Impor soal"}
      </button>
    </form>
  );
}

export function DeleteQuestionButton({ questionId }: { questionId: string }) {
  const [pending, start] = useTransition();
  return (
    <ConfirmButton
      onConfirm={() => start(() => deleteQuestion(questionId))}
      disabled={pending}
      className="text-sm font-medium text-red-700 hover:underline disabled:opacity-60"
      title="Hapus soal ini?"
      message="Soal dihapus dari tes ini dan tidak bisa dikembalikan."
      confirmLabel="Ya, hapus soal"
    >
      {pending ? "Menghapus..." : "Hapus"}
    </ConfirmButton>
  );
}

export function TrialToggle({ profileId, attended }: { profileId: string; attended: boolean }) {
  const [pending, start] = useTransition();
  return (
    <button onClick={() => start(() => setTrialAttended(profileId, !attended))} disabled={pending} className={smallButton} title="Membuka akses tingkat trial di zona latihan">
      {pending ? "..." : attended ? "✓ Hadir trial" : "Tandai hadir trial"}
    </button>
  );
}
