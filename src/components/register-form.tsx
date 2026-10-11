"use client";

import { useActionState, useState } from "react";
import { register, type RegisterState } from "@/app/daftar/[batchId]/actions";
import { buttonClass, Field, inputClass, Notice } from "@/components/ui/form";

// Pilihan mengikuti Google Form pendaftaran Weltgakkou.
const educationOptions = ["SMA/SMK", "D3", "S1"];
const priorLevelOptions = ["Hiragana & Katakana", "N5", "N4", "N3"];
const goalOptions = ["Kerja ke Jepang", "JLPT", "JFT", "Beasiswa", "Hobi"];

export function RegisterForm({
  batchId,
  monthlyLabel,
  upfrontLabel,
}: {
  batchId: string;
  monthlyLabel?: string;
  upfrontLabel?: string;
}) {
  const [state, action, pending] = useActionState(register.bind(null, batchId), {} as RegisterState);
  const err = state.fieldErrors ?? {};
  const v = state.values ?? {};
  const defaultPlan = v.plan || (upfrontLabel ? "lunas" : "bulanan");
  const [studied, setStudied] = useState(v.studied_before ?? "");
  const [education, setEducation] = useState(v.education ?? "");
  const [goal, setGoal] = useState(v.learning_goal ?? "");

  return (
    <form action={action} className="space-y-8" noValidate>
      {state.error && <Notice tone="error">{state.error}</Notice>}

      <Section title="Data diri">
        <Field label="Nama lengkap *" error={err.full_name}>
          <input name="full_name" defaultValue={v.full_name} required autoComplete="name" className={inputClass} />
        </Field>
        <Field label="Nama panggilan">
          <input name="nickname" defaultValue={v.nickname} autoComplete="nickname" className={inputClass} />
        </Field>
        <Choices
          legend="Jenis kelamin"
          name="gender"
          options={[
            ["laki-laki", "Laki-laki"],
            ["perempuan", "Perempuan"],
          ]}
          defaultValue={v.gender}
        />
        <Field label="Tempat, tanggal lahir">
          <input name="birth_place_date" defaultValue={v.birth_place_date} placeholder="Bandung, 17 Agustus 2003" className={inputClass} />
        </Field>
        <Field label="Domisili (tempat tinggal sekarang)">
          <input name="domicile" defaultValue={v.domicile} placeholder="Kota/kabupaten" className={inputClass} />
        </Field>
        <Field label="Alamat rumah">
          <textarea name="address" defaultValue={v.address} rows={2} autoComplete="street-address" className={inputClass} />
        </Field>
        <Choices
          legend="Pendidikan terakhir"
          name="education"
          options={[...educationOptions.map((o) => [o, o] as [string, string]), ["lainnya", "Lainnya"]]}
          defaultValue={v.education}
          onChange={setEducation}
        />
        {education === "lainnya" && (
          <input name="education_other" defaultValue={v.education_other} placeholder="Tulis pendidikan terakhir" aria-label="Pendidikan lainnya" className={inputClass} />
        )}
        <Field label="Pekerjaan saat ini">
          <input name="occupation" defaultValue={v.occupation} className={inputClass} />
        </Field>
      </Section>

      <Section title="Kontak">
        <Field label="Email * (untuk login ke area belajar)" error={err.email}>
          <input name="email" defaultValue={v.email} type="email" required autoComplete="email" className={inputClass} />
        </Field>
        <Field label="Nomor WhatsApp *" error={err.whatsapp}>
          <input name="whatsapp" defaultValue={v.whatsapp} required inputMode="tel" autoComplete="tel" placeholder="081234567890" className={inputClass} />
        </Field>
        <Field label="TikTok *" error={err.tiktok}>
          <input name="tiktok" defaultValue={v.tiktok} required placeholder="@akunkamu" className={inputClass} />
        </Field>
        <Field label="Instagram">
          <input name="instagram" defaultValue={v.instagram} placeholder="@akunkamu" className={inputClass} />
        </Field>
      </Section>

      <Section title="Belajar bahasa Jepang">
        <Choices
          legend="Apakah sudah pernah belajar bahasa Jepang? *"
          name="studied_before"
          options={[
            ["sudah", "Sudah"],
            ["belum", "Belum"],
          ]}
          defaultValue={v.studied_before}
          onChange={setStudied}
          error={err.studied_before}
        />
        {studied === "sudah" && (
          <Choices
            legend="Jika sudah, di level berapa?"
            name="prior_level"
            options={priorLevelOptions.map((o) => [o, o])}
            defaultValue={v.prior_level}
          />
        )}
        <Choices
          legend="Tujuan belajar"
          name="learning_goal"
          options={[...goalOptions.map((o) => [o, o] as [string, string]), ["lainnya", "Lainnya"]]}
          defaultValue={v.learning_goal}
          onChange={setGoal}
        />
        {goal === "lainnya" && (
          <input name="learning_goal_other" defaultValue={v.learning_goal_other} placeholder="Tulis tujuan belajar" aria-label="Tujuan lainnya" className={inputClass} />
        )}
      </Section>

      <Section title="Pembayaran">
        <fieldset>
          <legend className="mb-1 text-sm font-medium text-stone-700">Cara bayar</legend>
          <div className="space-y-2">
            {upfrontLabel && (
              <label className="flex items-center gap-3 rounded-lg border border-stone-300 bg-white p-3">
                <input type="radio" name="plan" value="lunas" defaultChecked={defaultPlan === "lunas"} />
                <span>
                  <span className="font-medium text-stone-900">Sekali bayar</span>{" "}
                  <span className="text-stone-600">{upfrontLabel}</span>
                </span>
              </label>
            )}
            {monthlyLabel && (
              <label className="flex items-center gap-3 rounded-lg border border-stone-300 bg-white p-3">
                <input type="radio" name="plan" value="bulanan" defaultChecked={defaultPlan === "bulanan"} />
                <span>
                  <span className="font-medium text-stone-900">Per bulan</span>{" "}
                  <span className="text-stone-600">{monthlyLabel}</span>
                </span>
              </label>
            )}
          </div>
          {err.plan && <span className="mt-1 block text-sm text-red-700">{err.plan}</span>}
        </fieldset>

        <Field label="Kode referral (opsional)">
          <input name="referral_code" defaultValue={v.referral_code} className={inputClass} />
        </Field>
      </Section>

      <Section title="Pernyataan">
        <label className="flex items-start gap-3 rounded-lg border border-stone-300 bg-white p-3 text-sm text-stone-800">
          <input type="checkbox" name="agree" value="setuju" defaultChecked={v.agree === "setuju"} className="mt-1" />
          <span>
            Saya menyatakan bahwa data yang saya berikan adalah benar, dan saya bersedia mengikuti seluruh peraturan
            kelas.
          </span>
        </label>
        {err.agree && <span className="block text-sm text-red-700">{err.agree}</span>}
      </Section>

      <div className="space-y-2">
        <button className={`${buttonClass} w-full py-3`} disabled={pending}>
          {pending ? "Memproses..." : "Daftar dan lanjut ke pembayaran"}
        </button>
        <p className="text-xs text-stone-500">
          Tagihan berlaku 24 jam. Kursi di batch disimpan selama tagihan belum kedaluwarsa.
        </p>
      </div>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="border-b border-stone-200 pb-1 text-lg font-semibold text-stone-900">{title}</h2>
      {children}
    </section>
  );
}

function Choices({
  legend,
  name,
  options,
  defaultValue,
  onChange,
  error,
}: {
  legend: string;
  name: string;
  options: [string, string][];
  defaultValue?: string;
  onChange?: (value: string) => void;
  error?: string;
}) {
  return (
    <fieldset>
      <legend className="mb-1 text-sm font-medium text-stone-700">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map(([value, label]) => (
          <label key={value} className="flex items-center gap-2 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm">
            <input
              type="radio"
              name={name}
              value={value}
              defaultChecked={defaultValue === value}
              onChange={() => onChange?.(value)}
            />
            {label}
          </label>
        ))}
      </div>
      {error && <span className="mt-1 block text-sm text-red-700">{error}</span>}
    </fieldset>
  );
}
