"use server";

import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { calendarLinks, goals, seminarWhen, trialWhen, upcomingSeminars } from "@/lib/seminars";

export type SeminarState = {
  status: "idle" | "ok" | "error";
  message?: string;
  fieldErrors?: Partial<Record<"seminar_id" | "full_name" | "whatsapp" | "email", string>>;
  values?: Record<string, string>;
  // Diisi saat berhasil: jadwal seminar (+ trial) dan tombol simpan ke kalender.
  when?: string;
  trialWhen?: string | null;
  calendars?: { label: string; url: string }[];
};

const fields = ["seminar_id", "full_name", "whatsapp", "email", "city", "goal", "source", "question"] as const;

const schema = z.object({
  seminar_id: z.string().uuid("Pilih jadwal seminar"),
  full_name: z.string().trim().min(2, "Nama minimal 2 huruf").max(100),
  whatsapp: z
    .string()
    .trim()
    .transform((v) => v.replace(/[\s-]/g, ""))
    .pipe(z.string().regex(/^(\+62|62|0)8\d{7,12}$/, "Nomor WhatsApp tidak valid, contoh 081234567890")),
  email: z.union([z.literal(""), z.email("Email tidak valid")]),
  city: z.string().trim().max(60).optional(),
  goal: z.enum(goals.map((g) => g.value) as [string, ...string[]]).optional(),
  source: z.string().trim().max(50).optional(),
  question: z.string().trim().max(500).optional(),
});

function normalizeWhatsapp(raw: string) {
  if (raw.startsWith("+62")) return "62" + raw.slice(3);
  if (raw.startsWith("0")) return "62" + raw.slice(1);
  return raw;
}

const gangguan = "Pendaftaran sedang gangguan. Silakan daftar lewat chat WhatsApp admin.";

export async function registerSeminar(_prev: SeminarState, formData: FormData): Promise<SeminarState> {
  // Honeypot: bot biasanya mengisi semua field.
  if (formData.get("website")) return { status: "ok", message: "Terima kasih!" };

  const values = Object.fromEntries(fields.map((k) => [k, String(formData.get(k) ?? "")]));
  const parsed = schema.safeParse(Object.fromEntries(fields.map((k) => [k, formData.get(k) || (k === "email" ? "" : undefined)])));
  if (!parsed.success) {
    const fieldErrors: SeminarState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof NonNullable<SeminarState["fieldErrors"]>;
      fieldErrors[key] ??= issue.message;
    }
    return { status: "error", message: "Periksa lagi isian yang ditandai.", fieldErrors, values };
  }

  const db = getSupabaseAdmin();
  if (!db) return { status: "error", message: gangguan, values };

  // Jadwal dicek ulang di server: masih buka, belum mulai, kuota belum penuh.
  const seminar = (await upcomingSeminars(db)).find((s) => s.id === parsed.data.seminar_id);
  if (!seminar) return { status: "error", message: "Jadwal ini sudah ditutup. Pilih jadwal lain.", values };
  if (seminar.full) return { status: "error", message: "Kuota jadwal ini sudah penuh. Pilih jadwal lain.", values };

  const row = {
    ...parsed.data,
    whatsapp: normalizeWhatsapp(parsed.data.whatsapp),
    email: parsed.data.email || null,
  };
  const ok: SeminarState = {
    status: "ok",
    when: seminarWhen(seminar),
    trialWhen: trialWhen(seminar),
    calendars: calendarLinks(seminar),
  };

  const { error } = await db.from("seminar_registrations").insert(row);
  if (error?.code === "23505") {
    return { ...ok, message: `Nomor ini sudah terdaftar di acara ${seminar.title}. Sampai ketemu!` };
  }
  if (error) {
    console.error("Gagal menyimpan pendaftar seminar", error);
    return { status: "error", message: gangguan, values };
  }
  return {
    ...ok,
    message: `Terima kasih, ${row.full_name.split(" ")[0]}! Kamu terdaftar di seminar gratis ${seminar.title}${ok.trialWhen ? " sekaligus kelas trial-nya" : ""}.`,
  };
}
