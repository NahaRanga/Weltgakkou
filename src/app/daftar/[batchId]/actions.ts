"use server";

import { redirect } from "next/navigation";
import { updateTag } from "next/cache";
import { z } from "zod";
import { createInvoice, seatsTaken } from "@/lib/billing";
import { notifyAdmin } from "@/lib/email";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { formatRupiah } from "@/lib/programs";

export type RegisterState = {
  error?: string;
  fieldErrors?: Partial<Record<"full_name" | "whatsapp" | "email" | "plan", string>>;
  values?: Record<string, string>;
};

const schema = z.object({
  full_name: z.string().trim().min(2, "Nama minimal 2 huruf").max(100),
  whatsapp: z
    .string()
    .trim()
    .transform((v) => v.replace(/[\s-]/g, ""))
    .pipe(z.string().regex(/^(\+62|62|0)8\d{7,12}$/, "Nomor WhatsApp tidak valid, contoh 081234567890"))
    .transform((v) => (v.startsWith("+62") ? "62" + v.slice(3) : v.startsWith("0") ? "62" + v.slice(1) : v)),
  email: z.email("Email wajib diisi, dipakai untuk login").transform((v) => v.toLowerCase()),
  plan: z.enum(["bulanan", "lunas"], "Pilih cara bayar"),
  referral_code: z.string().trim().toUpperCase().max(30).optional(),
});

export async function register(batchId: string, _prev: RegisterState, formData: FormData): Promise<RegisterState> {
  const values = Object.fromEntries(
    ["full_name", "whatsapp", "email", "plan", "referral_code"].map((k) => [k, String(formData.get(k) ?? "")]),
  );
  const parsed = schema.safeParse({ ...values, referral_code: values.referral_code || undefined });
  if (!parsed.success) {
    const fieldErrors: RegisterState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof NonNullable<RegisterState["fieldErrors"]>;
      fieldErrors[key] ??= issue.message;
    }
    return { error: "Periksa lagi isian yang ditandai.", fieldErrors, values };
  }
  const input = parsed.data;

  const db = getSupabaseAdmin();
  if (!db) return { error: "Pendaftaran sedang gangguan. Silakan hubungi kami lewat WhatsApp.", values };

  const { data: batch } = await db
    .from("batches")
    .select("id, name, status, quota, programs(name, monthly_price, upfront_price)")
    .eq("id", batchId)
    .maybeSingle();
  const program = batch?.programs as unknown as { name: string; monthly_price: number | null; upfront_price: number | null } | undefined;
  if (!batch || !program || batch.status !== "buka") return { error: "Batch ini sudah tidak menerima pendaftaran.", values };

  const baseAmount = input.plan === "bulanan" ? program.monthly_price : program.upfront_price;
  if (!baseAmount) return { error: "Cara bayar ini tidak tersedia untuk program ini.", values };

  // Cari akun lama berdasarkan email, atau buat akun baru (password diatur setelah lunas).
  let profileId: string;
  const { data: existing } = await db.from("profiles").select("id").eq("email", input.email).maybeSingle();
  if (existing) {
    profileId = existing.id;
    await db.from("profiles").update({ whatsapp: input.whatsapp }).eq("id", profileId);
  } else {
    const { data: created, error } = await db.auth.admin.createUser({
      email: input.email,
      email_confirm: true,
      user_metadata: { full_name: input.full_name },
    });
    if (error || !created.user) {
      console.error("Gagal membuat akun", error);
      return { error: "Email ini sudah terdaftar dengan cara lain. Hubungi admin lewat WhatsApp.", values };
    }
    profileId = created.user.id;
    const { error: profileError } = await db.from("profiles").insert({
      id: profileId,
      email: input.email,
      full_name: input.full_name,
      whatsapp: input.whatsapp,
      referral_code: referralCodeFor(input.full_name, profileId),
    });
    if (profileError) throw profileError;
  }

  // Pendaftar yang sama di batch yang sama: tampilkan lagi tagihannya.
  const { data: prior } = await db
    .from("enrollments")
    .select("id, status, invoices(code, status)")
    .eq("profile_id", profileId)
    .eq("batch_id", batchId)
    .maybeSingle();
  if (prior && prior.status !== "keluar") {
    const open = (prior.invoices as { code: string; status: string }[]).find((i) => i.status !== "kedaluwarsa");
    if (open) redirect(`/bayar/${open.code}`);
  }

  if ((await seatsTaken(db, batchId)) >= batch.quota) return { error: "Maaf, kuota batch ini sudah penuh.", values };

  let enrollmentId: string;
  if (prior) {
    enrollmentId = prior.id;
    await db.from("enrollments").update({ status: "menunggu_bayar", plan: input.plan, referral_code: input.referral_code ?? null }).eq("id", prior.id);
  } else {
    const { data: enrollment, error } = await db
      .from("enrollments")
      .insert({ profile_id: profileId, batch_id: batchId, plan: input.plan, referral_code: input.referral_code ?? null })
      .select("id")
      .single();
    if (error) throw error;
    enrollmentId = enrollment.id;
  }

  const code = await createInvoice(db, { enrollmentId, baseAmount, installmentNo: 1, dueInHours: 24 });
  await db.from("leads").update({ status: "daftar" }).eq("whatsapp", input.whatsapp).in("status", ["baru", "dihubungi"]);
  updateTag("batches");

  await notifyAdmin(
    `Pendaftar baru: ${input.full_name} (${program.name})`,
    `${input.full_name} mendaftar ${program.name}, ${batch.name}.\nCara bayar: ${input.plan}, tagihan pertama ${formatRupiah(baseAmount)} + kode unik.\nWhatsApp: https://wa.me/${input.whatsapp}\nKode tagihan: ${code}`,
  ).catch(() => {});

  redirect(`/bayar/${code}`);
}

function referralCodeFor(name: string, id: string) {
  const first = name.split(/\s+/)[0].toUpperCase().replace(/[^A-Z]/g, "").slice(0, 6) || "WG";
  return `${first}${id.slice(0, 4).toUpperCase()}`;
}
