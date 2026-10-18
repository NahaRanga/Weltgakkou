"use server";

import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getProgram } from "@/lib/programs";

export type WaitingListState = {
  status: "idle" | "ok" | "error";
  message?: string;
  fieldErrors?: Partial<Record<"full_name" | "whatsapp" | "email" | "program_slug", string>>;
  // Isian dikembalikan agar form tidak kosong lagi setelah gagal validasi.
  values?: Record<string, string>;
};

const schema = z.object({
  full_name: z.string().trim().min(2, "Nama minimal 2 huruf").max(100),
  whatsapp: z
    .string()
    .trim()
    .transform((v) => v.replace(/[\s-]/g, ""))
    .pipe(z.string().regex(/^(\+62|62|0)8\d{7,12}$/, "Nomor WhatsApp tidak valid, contoh 081234567890")),
  email: z.union([z.literal(""), z.email("Email tidak valid")]),
  program_slug: z.string().refine((s) => getProgram(s) !== undefined, "Pilih program"),
  source: z.string().trim().max(50).optional(),
  referral_code: z.string().trim().max(30).optional(),
  note: z.string().trim().max(500).optional(),
});

function normalizeWhatsapp(raw: string) {
  if (raw.startsWith("+62")) return "62" + raw.slice(3);
  if (raw.startsWith("0")) return "62" + raw.slice(1);
  return raw;
}

export async function joinWaitingList(
  _prev: WaitingListState,
  formData: FormData,
): Promise<WaitingListState> {
  // Honeypot: bot biasanya mengisi semua field.
  if (formData.get("website")) return { status: "ok", message: "Terima kasih!" };

  const values = Object.fromEntries(
    ["full_name", "whatsapp", "email", "program_slug", "source", "referral_code", "note"].map((k) => [k, String(formData.get(k) ?? "")]),
  );

  const parsed = schema.safeParse({
    full_name: formData.get("full_name") ?? "",
    whatsapp: formData.get("whatsapp") ?? "",
    email: formData.get("email") ?? "",
    program_slug: formData.get("program_slug") ?? "",
    source: formData.get("source") || undefined,
    referral_code: formData.get("referral_code") || undefined,
    note: formData.get("note") || undefined,
  });

  if (!parsed.success) {
    const fieldErrors: WaitingListState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof NonNullable<WaitingListState["fieldErrors"]>;
      fieldErrors[key] ??= issue.message;
    }
    return { status: "error", message: "Periksa lagi isian yang ditandai.", fieldErrors, values };
  }

  const lead = { ...parsed.data, whatsapp: normalizeWhatsapp(parsed.data.whatsapp), email: parsed.data.email || null };

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    console.error("SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY belum diisi; lead tidak tersimpan", lead.full_name);
    return { status: "error", message: "Pendaftaran sedang gangguan. Silakan hubungi kami lewat WhatsApp.", values };
  }

  const { error } = await supabase.from("leads").insert(lead);
  if (error) {
    console.error("Gagal menyimpan lead", error);
    return { status: "error", message: "Pendaftaran sedang gangguan. Silakan hubungi kami lewat WhatsApp.", values };
  }

  await notifyAdmin(lead).catch((err) => console.error("Gagal mengirim email ke admin", err));

  const program = getProgram(lead.program_slug);
  return {
    status: "ok",
    message: `Terima kasih, ${lead.full_name}! Kamu masuk waiting list ${program?.name}. Tim Weltgakko akan menghubungi lewat WhatsApp.`,
  };
}

async function notifyAdmin(lead: { full_name: string; whatsapp: string; email: string | null; program_slug: string; source?: string; referral_code?: string; note?: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.ADMIN_EMAIL;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !to || !from) return;

  const lines = [
    `Nama: ${lead.full_name}`,
    `WhatsApp: https://wa.me/${lead.whatsapp}`,
    `Email: ${lead.email ?? "-"}`,
    `Program: ${lead.program_slug}`,
    `Sumber: ${lead.source ?? "-"}`,
    `Kode referral: ${lead.referral_code ?? "-"}`,
    `Catatan: ${lead.note ?? "-"}`,
  ];

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, subject: `Lead baru: ${lead.full_name} (${lead.program_slug})`, text: lines.join("\n") }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
}
