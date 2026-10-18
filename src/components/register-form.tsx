"use client";

import { startTransition, useActionState, useRef, useState } from "react";
import Link from "next/link";
import { trackEvent } from "@/components/analytics";
import { confirmEmailCode, register, requestEmailCode, type RegisterState } from "@/app/(site)/daftar/[batchId]/actions";
import { buttonClass, Field, inputClass, Notice } from "@/components/ui/form";

// Pilihan mengikuti Google Form pendaftaran Weltgakko.
const educationOptions = ["SMA/SMK", "D3", "S1"];
const priorLevelOptions = ["Hiragana & Katakana", "N5", "N4", "N3"];
const goalOptions = ["Kerja ke Jepang", "JLPT", "JFT", "Beasiswa", "Hobi"];

export function RegisterForm({
  batchId,
  verifyEmail = false,
  monthlyLabel,
  upfrontLabel,
}: {
  batchId: string;
  verifyEmail?: boolean;
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
  const checkoutTracked = useRef(false);

  return (
    // Dikirim lewat onSubmit, bukan action=, supaya isian (pilihan, centang, email terverifikasi)
    // tidak di-reset React ketika server mengembalikan pesan error.
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        // Konversi iklan: mulai checkout, sekali per form walau dikirim ulang setelah error.
        // Tagihan dibuat di server lalu dialihkan ke /bayar, yang tidak memuat pixel.
        if (!checkoutTracked.current) trackEvent("InitiateCheckout");
        checkoutTracked.current = true;
        startTransition(() => action(data));
      }}
      className="space-y-4"
      noValidate
    >
      {state.error && <Notice tone="error">{state.error}</Notice>}
      <Field label="Nama lengkap" error={err.full_name}>
        <input name="full_name" defaultValue={v.full_name} required autoComplete="name" className={inputClass} />
      </Field>
      <Field label="Nomor WhatsApp" error={err.whatsapp}>
        <input name="whatsapp" defaultValue={v.whatsapp} required inputMode="tel" autoComplete="tel" placeholder="081234567890" className={inputClass} />
      </Field>
      {verifyEmail ? (
        <EmailWithCode defaultValue={v.email} error={err.email} />
      ) : (
        <Field label="Email (untuk login ke area belajar)" error={err.email}>
          <input name="email" defaultValue={v.email} type="email" required autoComplete="email" className={inputClass} />
        </Field>
      )}
      <Field label="Nama panggilan (opsional)">
        <input name="nickname" defaultValue={v.nickname} autoComplete="nickname" className={inputClass} />
      </Field>
      <Field label="Jenis kelamin (opsional)">
        <select name="gender" defaultValue={v.gender ?? ""} className={inputClass}>
          <option value="">Pilih</option>
          <option value="laki-laki">Laki-laki</option>
          <option value="perempuan">Perempuan</option>
        </select>
      </Field>
      <Field label="Tempat, tanggal lahir (opsional)">
        <input name="birth_place_date" defaultValue={v.birth_place_date} placeholder="Bandung, 17 Agustus 2003" className={inputClass} />
      </Field>
      <Field label="Domisili, tempat tinggal sekarang (opsional)">
        <input name="domicile" defaultValue={v.domicile} placeholder="Kota/kabupaten" className={inputClass} />
      </Field>
      <Field label="Alamat rumah (opsional)">
        <input name="address" defaultValue={v.address} autoComplete="street-address" className={inputClass} />
      </Field>
      <Field label="Pendidikan terakhir (opsional)">
        <select name="education" defaultValue={v.education ?? ""} onChange={(e) => setEducation(e.target.value)} className={inputClass}>
          <option value="">Pilih</option>
          {educationOptions.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
          <option value="lainnya">Lainnya</option>
        </select>
      </Field>
      {education === "lainnya" && (
        <input name="education_other" defaultValue={v.education_other} placeholder="Tulis pendidikan terakhir" aria-label="Pendidikan lainnya" className={inputClass} />
      )}
      <Field label="Pekerjaan saat ini (opsional)">
        <input name="occupation" defaultValue={v.occupation} className={inputClass} />
      </Field>
      <Field label="Akun TikTok" error={err.tiktok}>
        <input name="tiktok" defaultValue={v.tiktok} required placeholder="@akunkamu" className={inputClass} />
      </Field>
      <Field label="Akun Instagram (opsional)">
        <input name="instagram" defaultValue={v.instagram} placeholder="@akunkamu" className={inputClass} />
      </Field>
      <Field label="Sudah pernah belajar bahasa Jepang?" error={err.studied_before}>
        <select name="studied_before" defaultValue={v.studied_before ?? ""} onChange={(e) => setStudied(e.target.value)} required className={inputClass}>
          <option value="" disabled>
            Pilih
          </option>
          <option value="sudah">Sudah</option>
          <option value="belum">Belum</option>
        </select>
      </Field>
      {studied === "sudah" && (
        <Field label="Jika sudah, di level berapa?">
          <select name="prior_level" defaultValue={v.prior_level ?? ""} className={inputClass}>
            <option value="">Pilih</option>
            {priorLevelOptions.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </Field>
      )}
      <Field label="Tujuan belajar (opsional)">
        <select name="learning_goal" defaultValue={v.learning_goal ?? ""} onChange={(e) => setGoal(e.target.value)} className={inputClass}>
          <option value="">Pilih</option>
          {goalOptions.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
          <option value="lainnya">Lainnya</option>
        </select>
      </Field>
      {goal === "lainnya" && (
        <input name="learning_goal_other" defaultValue={v.learning_goal_other} placeholder="Tulis tujuan belajar" aria-label="Tujuan lainnya" className={inputClass} />
      )}

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

      <label className="flex items-start gap-3 text-sm text-stone-700">
        <input type="checkbox" name="agree" value="setuju" defaultChecked={v.agree === "setuju"} className="mt-1" />
        <span>
          Saya menyatakan data yang saya berikan benar, bersedia mengikuti seluruh peraturan kelas, dan setuju dengan{" "}
          <Link href="/refund" target="_blank" className="font-semibold text-red-700 underline">
            kebijakan refund
          </Link>
          .
        </span>
      </label>
      {err.agree && <span className="block text-sm text-red-700">{err.agree}</span>}

      <button className={`${buttonClass} w-full py-3`} disabled={pending}>
        {pending ? "Memproses..." : "Daftar dan lanjut ke pembayaran"}
      </button>
      <p className="text-xs text-stone-500">Tagihan berlaku 24 jam. Kursi di batch disimpan selama tagihan belum kedaluwarsa.</p>
    </form>
  );
}

// Email wajib diverifikasi: kirim kode 6 digit ke email, lalu cocokkan sebelum daftar.
export function EmailWithCode({ defaultValue, error }: { defaultValue?: string; error?: string }) {
  const [email, setEmail] = useState(defaultValue ?? "");
  const [sentTo, setSentTo] = useState("");
  const [verified, setVerified] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "error" | "ok" | "info"; text: string } | null>(null);
  const isVerified = verified !== "" && verified === email.trim().toLowerCase();

  async function send() {
    setBusy(true);
    setMessage(null);
    const res = await requestEmailCode(email);
    setBusy(false);
    if (res.error) return setMessage({ tone: "error", text: res.error });
    setSentTo(email.trim().toLowerCase());
    setMessage({ tone: "info", text: `Kode 6 angka sudah dikirim ke ${email.trim()} dari admin@weltgakko.com. Cek juga folder Spam/Promosi.` });
  }

  async function confirm() {
    setBusy(true);
    const res = await confirmEmailCode(email, code);
    setBusy(false);
    if (res.error) return setMessage({ tone: "error", text: res.error });
    setVerified(email.trim().toLowerCase());
    setMessage({ tone: "ok", text: "Email terverifikasi." });
  }

  return (
    <div className="space-y-2">
      <Field label="Email (untuk login ke area belajar)" error={isVerified ? undefined : error}>
        <div className="flex gap-2">
          <input
            name="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            required
            autoComplete="email"
            readOnly={isVerified}
            className={`${inputClass} ${isVerified ? "bg-emerald-50" : ""}`}
          />
          {!isVerified && (
            <button type="button" onClick={send} disabled={busy || !email.includes("@")} className="shrink-0 rounded-lg border border-stone-300 px-3 text-sm font-semibold text-stone-800 hover:border-stone-500 disabled:opacity-50">
              {sentTo === email.trim().toLowerCase() ? "Kirim ulang" : "Kirim kode"}
            </button>
          )}
        </div>
      </Field>
      {sentTo !== "" && !isVerified && sentTo === email.trim().toLowerCase() && (
        <div className="flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="Kode 6 angka"
            aria-label="Kode verifikasi"
            className={`${inputClass} tracking-widest`}
          />
          <button type="button" onClick={confirm} disabled={busy || code.length !== 6} className="shrink-0 rounded-lg bg-stone-900 px-4 text-sm font-semibold text-white hover:bg-stone-700 disabled:opacity-50">
            Verifikasi
          </button>
        </div>
      )}
      {message && <Notice tone={message.tone}>{isVerified ? "✓ " : ""}{message.text}</Notice>}
    </div>
  );
}
