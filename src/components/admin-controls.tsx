"use client";

import { useActionState, useState, useTransition } from "react";
import {
  acceptPayment,
  addCertification,
  addMaterial,
  addStaff,
  cancelInvoice,
  changePassword,
  createBatch,
  createNextInstallment,
  markInvoicePaid,
  rejectPayment,
  sendPasswordLink,
  updateBatch,
  updateProfile,
  type BatchState,
  type FormState,
  type VerifyState,
} from "@/app/admin/actions";
import { buttonClass, Field, inputClass, Notice } from "@/components/ui/form";
import { withBase } from "@/lib/base-path";

function WhatsappFollowUp({ state }: { state: { whatsappText?: string; whatsapp?: string } }) {
  if (!state.whatsappText) return null;
  const href = state.whatsapp
    ? `https://wa.me/${state.whatsapp}?text=${encodeURIComponent(state.whatsappText)}`
    : undefined;
  return (
    <div className="mt-2 space-y-2">
      <p className="text-sm text-stone-700">Email belum aktif. Kirim pesan ini ke siswa lewat WhatsApp:</p>
      <textarea readOnly value={state.whatsappText} rows={5} className={`${inputClass} text-xs`} />
      {href && (
        <a href={href} target="_blank" rel="noreferrer" className="inline-block rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white">
          Buka WhatsApp
        </a>
      )}
    </div>
  );
}

export function VerifyButtons({ invoiceId }: { invoiceId: string }) {
  const [state, setState] = useState<VerifyState>({});
  const [pending, start] = useTransition();
  const [reason, setReason] = useState("");

  if (state.done) {
    return (
      <div>
        <Notice tone={state.done === "accepted" ? "ok" : "info"}>
          {state.done === "accepted" ? "Diterima. Akun dan kelas siswa sudah aktif." : "Ditolak. Siswa bisa unggah ulang."}
        </Notice>
        <WhatsappFollowUp state={state} />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {state.error && <Notice tone="error">{state.error}</Notice>}
      <div className="flex flex-wrap gap-2">
        <button
          className="rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          disabled={pending}
          onClick={() => start(async () => setState(await acceptPayment(invoiceId)))}
        >
          Terima
        </button>
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Alasan tolak (opsional)"
          className={`${inputClass} max-w-xs flex-1 py-1.5 text-sm`}
        />
        <button
          className="rounded-lg border border-red-300 px-4 py-2 font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
          disabled={pending}
          onClick={() => start(async () => setState(await rejectPayment(invoiceId, reason)))}
        >
          Tolak
        </button>
      </div>
    </div>
  );
}

export function InstallmentButton({ enrollmentId }: { enrollmentId: string }) {
  const [result, setResult] = useState<{ code?: string; error?: string }>({});
  const [pending, start] = useTransition();
  if (result.code) {
    return (
      <a href={withBase(`/bayar/${result.code}`)} className="text-sm font-semibold text-emerald-700 underline">
        Tagihan {result.code} dibuat
      </a>
    );
  }
  return (
    <span>
      <button
        className="text-sm font-semibold text-red-700 hover:underline disabled:opacity-60"
        disabled={pending}
        onClick={() => start(async () => setResult(await createNextInstallment(enrollmentId)))}
      >
        Buat tagihan bulan berikutnya
      </button>
      {result.error && <span className="ml-2 text-sm text-red-700">{result.error}</span>}
    </span>
  );
}

const DAYS = [
  { v: 1, l: "Sen" },
  { v: 2, l: "Sel" },
  { v: 3, l: "Rab" },
  { v: 4, l: "Kam" },
  { v: 5, l: "Jum" },
  { v: 6, l: "Sab" },
];

export function BatchForm({ programs }: { programs: { id: string; name: string; months: number | null }[] }) {
  const [state, action, pending] = useActionState(createBatch, {} as BatchState);
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        {state.error && <Notice tone="error">{state.error}</Notice>}
        {state.ok && <Notice tone="ok">{state.ok}</Notice>}
      </div>
      <Field label="Program">
        <select name="program_id" required className={inputClass}>
          {programs.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Nama batch">
        <input name="name" required placeholder="Batch 1 Malam" className={inputClass} />
      </Field>
      <Field label="Tanggal mulai">
        <input name="start_date" type="date" required className={inputClass} />
      </Field>
      <Field label="Jam mulai (WIB)">
        <input name="start_time" type="time" defaultValue="19:30" required className={inputClass} />
      </Field>
      <Field label="Jumlah minggu">
        <input name="weeks" type="number" min={1} max={52} defaultValue={12} required className={inputClass} />
      </Field>
      <Field label="Kuota">
        <input name="quota" type="number" min={1} max={50} defaultValue={10} required className={inputClass} />
      </Field>
      <fieldset>
        <legend className="mb-1 text-sm font-medium text-stone-700">Hari kelas</legend>
        <div className="flex flex-wrap gap-3 text-sm">
          {DAYS.map((d) => (
            <label key={d.v} className="flex items-center gap-1">
              <input type="checkbox" name="class_days" value={d.v} defaultChecked={d.v <= 4} /> {d.l}
            </label>
          ))}
        </div>
      </fieldset>
      <Field label="Hari ujian mingguan">
        <select name="exam_day" defaultValue="5" className={inputClass}>
          <option value="0">Tidak ada</option>
          {DAYS.map((d) => (
            <option key={d.v} value={d.v}>
              {d.l}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Keterangan jadwal (tampil ke calon siswa)">
        <input name="schedule_label" required defaultValue="Senin-Kamis 19.30-21.00 WIB, ujian Jumat" className={inputClass} />
      </Field>
      <Field label="Link Google Meet (bisa diisi nanti)">
        <input name="meeting_url" type="url" placeholder="https://meet.google.com/..." className={inputClass} />
      </Field>
      <div className="sm:col-span-2">
        <button className={buttonClass} disabled={pending}>
          {pending ? "Membuat..." : "Buat batch dan jadwal"}
        </button>
      </div>
    </form>
  );
}

export function InvoiceActions({ invoiceId }: { invoiceId: string }) {
  const [state, setState] = useState<VerifyState>({});
  const [pending, start] = useTransition();
  if (state.done) {
    return (
      <div>
        <span className="text-sm font-medium text-emerald-700">Ditandai lunas</span>
        <WhatsappFollowUp state={state} />
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        className="rounded-lg border border-emerald-300 px-2.5 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-50 disabled:opacity-60"
        disabled={pending}
        onClick={() => {
          if (confirm("Tandai tagihan ini lunas? Pastikan uangnya sudah masuk ke rekening.")) start(async () => setState(await markInvoicePaid(invoiceId)));
        }}
      >
        Tandai lunas
      </button>
      <button
        className="rounded-lg border border-stone-300 px-2.5 py-1 text-xs text-stone-700 hover:bg-stone-50 disabled:opacity-60"
        disabled={pending}
        onClick={() => {
          if (confirm("Batalkan tagihan ini?")) start(async () => cancelInvoice(invoiceId));
        }}
      >
        Batalkan
      </button>
      {state.error && <span className="text-xs text-red-700">{state.error}</span>}
    </div>
  );
}

function Messages({ state }: { state: FormState }) {
  return (
    <>
      {state.error && <Notice tone="error">{state.error}</Notice>}
      {state.ok && <Notice tone="ok">{state.ok}</Notice>}
      <WhatsappFollowUp state={state} />
    </>
  );
}

export function BatchEditForm({
  batch,
  teachers,
}: {
  batch: { id: string; name: string; schedule_label: string; quota: number; meeting_url: string | null; teacher_id: string | null };
  teachers: { id: string; full_name: string }[];
}) {
  const [state, action, pending] = useActionState(updateBatch.bind(null, batch.id), {} as FormState);
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Messages state={state} />
      </div>
      <Field label="Nama batch">
        <input name="name" defaultValue={batch.name} required className={inputClass} />
      </Field>
      <Field label="Kuota">
        <input name="quota" type="number" min={1} max={50} defaultValue={batch.quota} required className={inputClass} />
      </Field>
      <Field label="Keterangan jadwal">
        <input name="schedule_label" defaultValue={batch.schedule_label} required className={inputClass} />
      </Field>
      <Field label="Pengajar">
        <select name="teacher_id" defaultValue={batch.teacher_id ?? ""} className={inputClass}>
          <option value="">Belum ditentukan</option>
          {teachers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.full_name}
            </option>
          ))}
        </select>
      </Field>
      <div className="sm:col-span-2">
        <Field label="Link Google Meet batch">
          <input name="meeting_url" type="url" defaultValue={batch.meeting_url ?? ""} placeholder="https://meet.google.com/..." className={inputClass} />
        </Field>
      </div>
      <div className="sm:col-span-2">
        <button className={buttonClass} disabled={pending}>
          {pending ? "Menyimpan..." : "Simpan batch"}
        </button>
      </div>
    </form>
  );
}

export function MaterialForm({ batchId, sessions, allowProgramWide }: { batchId: string; sessions: { id: string; label: string }[]; allowProgramWide: boolean }) {
  const [state, action, pending] = useActionState(addMaterial.bind(null, batchId), {} as FormState);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Messages state={state} />
      </div>
      <Field label="Judul materi">
        <input name="title" required placeholder="Bab 1: Salam dan perkenalan" className={inputClass} />
      </Field>
      <Field label="Jenis">
        <select name="kind" className={inputClass}>
          <option value="pdf">PDF</option>
          <option value="video">Video</option>
          <option value="link">Link lain</option>
        </select>
      </Field>
      <Field label="Link (Google Drive, YouTube, dll.)">
        <input name="url" type="url" required placeholder="https://drive.google.com/..." className={inputClass} />
      </Field>
      <Field label="Untuk sesi">
        <select name="session_id" className={inputClass}>
          {allowProgramWide && <option value="">Semua batch program ini</option>}
          {sessions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </Field>
      <div className="sm:col-span-2">
        <button className={buttonClass} disabled={pending}>
          {pending ? "Menyimpan..." : "Tambah materi"}
        </button>
      </div>
    </form>
  );
}

export function StaffForm() {
  const [state, action, pending] = useActionState(addStaff, {} as FormState);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Messages state={state} />
      </div>
      <Field label="Nama lengkap">
        <input name="full_name" required className={inputClass} />
      </Field>
      <Field label="Email (untuk login)">
        <input name="email" type="email" required className={inputClass} />
      </Field>
      <Field label="Nomor WhatsApp">
        <input name="whatsapp" inputMode="tel" placeholder="081234567890" className={inputClass} />
      </Field>
      <Field label="Peran">
        <select name="role" className={inputClass}>
          <option value="pengajar">Pengajar</option>
          <option value="konten">Konten</option>
          <option value="admin">Admin</option>
        </select>
      </Field>
      <div className="sm:col-span-2">
        <button className={buttonClass} disabled={pending}>
          {pending ? "Membuat akun..." : "Tambah anggota tim"}
        </button>
      </div>
    </form>
  );
}

export function PasswordLinkButton({ profileId }: { profileId: string }) {
  const [state, setState] = useState<FormState>({});
  const [pending, start] = useTransition();
  return (
    <div>
      <button
        className="text-xs font-medium text-red-700 hover:underline disabled:opacity-60"
        disabled={pending}
        onClick={() => start(async () => setState(await sendPasswordLink(profileId)))}
      >
        {pending ? "Membuat link..." : "Kirim link atur password"}
      </button>
      {state.error && <p className="text-xs text-red-700">{state.error}</p>}
      {state.ok && <p className="text-xs text-emerald-700">{state.ok}</p>}
      <WhatsappFollowUp state={state} />
    </div>
  );
}

export function CertificationForm({ students }: { students: { id: string; full_name: string }[] }) {
  const [state, action, pending] = useActionState(addCertification, {} as FormState);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div className="sm:col-span-2 lg:col-span-4">
        <Messages state={state} />
      </div>
      <Field label="Siswa">
        <select name="profile_id" required className={inputClass}>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.full_name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Ujian">
        <select name="kind" className={inputClass}>
          {["N5", "N4", "N3", "JFT", "A1", "A2", "B1", "B2"].map((k) => (
            <option key={k} value={k}>
              {k === "JFT" ? "JFT-Basic" : /^N/.test(k) ? `JLPT ${k}` : `Goethe ${k}`}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Hasil">
        <select name="passed" className={inputClass}>
          <option value="lulus">Lulus</option>
          <option value="tidak">Belum lulus</option>
        </select>
      </Field>
      <Field label="Tanggal ujian">
        <input name="exam_date" type="date" className={inputClass} />
      </Field>
      <div className="sm:col-span-2 lg:col-span-4">
        <button className={buttonClass} disabled={pending}>
          {pending ? "Menyimpan..." : "Catat hasil ujian"}
        </button>
      </div>
    </form>
  );
}

export function ProfileForm({ fullName, whatsapp }: { fullName: string; whatsapp: string | null }) {
  const [state, action, pending] = useActionState(updateProfile, {} as FormState);
  return (
    <form action={action} className="space-y-3">
      <Messages state={state} />
      <Field label="Nama lengkap">
        <input name="full_name" defaultValue={fullName} required className={inputClass} />
      </Field>
      <Field label="Nomor WhatsApp">
        <input name="whatsapp" defaultValue={whatsapp ?? ""} inputMode="tel" className={inputClass} />
      </Field>
      <button className={buttonClass} disabled={pending}>
        {pending ? "Menyimpan..." : "Simpan profil"}
      </button>
    </form>
  );
}

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState(changePassword, {} as FormState);
  return (
    <form action={action} className="space-y-3">
      <Messages state={state} />
      <Field label="Password baru (minimal 8 karakter)">
        <input name="password" type="password" required minLength={8} autoComplete="new-password" className={inputClass} />
      </Field>
      <Field label="Ulangi password baru">
        <input name="confirm" type="password" required minLength={8} autoComplete="new-password" className={inputClass} />
      </Field>
      <button className={buttonClass} disabled={pending}>
        {pending ? "Mengganti..." : "Ganti password"}
      </button>
    </form>
  );
}
