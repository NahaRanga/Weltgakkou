"use server";

import { refresh } from "next/cache";
import { notifyAdmin } from "@/lib/email";
import { formatRupiah } from "@/lib/programs";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export type UploadState = { error?: string; ok?: boolean };

const ALLOWED: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};
const MAX_BYTES = 5 * 1024 * 1024;

export async function uploadProof(code: string, _prev: UploadState, formData: FormData): Promise<UploadState> {
  const file = formData.get("proof");
  const method = formData.get("method") === "qris" ? "qris" : "transfer";
  if (!(file instanceof File) || file.size === 0) return { error: "Pilih foto atau PDF bukti pembayaran." };
  const ext = ALLOWED[file.type];
  if (!ext) return { error: "Format file harus JPG, PNG, WEBP, atau PDF." };
  if (file.size > MAX_BYTES) return { error: "Ukuran file maksimal 5 MB." };

  const db = getSupabaseAdmin();
  if (!db) return { error: "Upload sedang gangguan. Kirim bukti lewat WhatsApp ke admin." };

  const { data: invoice } = await db
    .from("invoices")
    .select("id, status, amount, enrollments(profiles(full_name))")
    .eq("code", code)
    .maybeSingle();
  if (!invoice) return { error: "Tagihan tidak ditemukan." };
  if (invoice.status !== "belum" && invoice.status !== "ditolak") return { error: "Tagihan ini tidak sedang menunggu pembayaran." };

  const path = `${invoice.id}/${Date.now()}.${ext}`;
  const { error: uploadError } = await db.storage
    .from("payment-proofs")
    .upload(path, file, { contentType: file.type });
  if (uploadError) {
    console.error("Upload bukti gagal", uploadError);
    return { error: "Upload gagal. Coba lagi atau kirim bukti lewat WhatsApp." };
  }

  await db.from("payment_proofs").insert({ invoice_id: invoice.id, file_path: path });
  await db.from("invoices").update({ status: "menunggu_verifikasi", method, reject_reason: null }).eq("id", invoice.id);
  refresh();

  const name = (invoice.enrollments as unknown as { profiles: { full_name: string } }).profiles.full_name;
  await notifyAdmin(
    `Bukti bayar masuk: ${name} ${formatRupiah(invoice.amount)}`,
    `${name} mengunggah bukti ${method} untuk tagihan ${code} sebesar ${formatRupiah(invoice.amount)}.\nCocokkan dengan mutasi lalu verifikasi di halaman admin.`,
  ).catch(() => {});

  return { ok: true };
}
