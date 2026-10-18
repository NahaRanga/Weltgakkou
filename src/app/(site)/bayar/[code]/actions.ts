"use server";

import { refresh } from "next/cache";
import { expireOverdueInvoices } from "@/lib/billing";
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
// Batas unggahan per tagihan, supaya satu kode tidak dipakai mengisi storage.
const MAX_PROOFS = 5;

// Tipe file dari browser bisa dipalsukan, jadi cocokkan juga byte awal file.
async function looksLike(file: File, ext: string) {
  const b = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const starts = (...sig: number[]) => sig.every((v, i) => b[i] === v);
  if (ext === "jpg") return starts(0xff, 0xd8, 0xff);
  if (ext === "png") return starts(0x89, 0x50, 0x4e, 0x47);
  if (ext === "pdf") return starts(0x25, 0x50, 0x44, 0x46); // %PDF
  return starts(0x52, 0x49, 0x46, 0x46) && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50; // RIFF....WEBP
}

export async function uploadProof(code: string, _prev: UploadState, formData: FormData): Promise<UploadState> {
  const file = formData.get("proof");
  const method = formData.get("method") === "qris" ? "qris" : "transfer";
  if (!(file instanceof File) || file.size === 0) return { error: "Pilih foto atau PDF bukti pembayaran." };
  const ext = ALLOWED[file.type];
  if (!ext) return { error: "Format file harus JPG, PNG, WEBP, atau PDF." };
  if (file.size > MAX_BYTES) return { error: "Ukuran file maksimal 5 MB." };
  if (!(await looksLike(file, ext))) return { error: "File tidak terbaca sebagai JPG, PNG, WEBP, atau PDF." };
  if (!/^WG[A-Z0-9]{8}$/.test(code)) return { error: "Tagihan tidak ditemukan." };

  const db = getSupabaseAdmin();
  if (!db) return { error: "Upload sedang gangguan. Kirim bukti lewat WhatsApp ke admin." };
  // Tagihan yang lewat batas waktu ditandai kedaluwarsa dulu, sama seperti saat halaman dibuka.
  await expireOverdueInvoices(db);

  const { data: invoice } = await db
    .from("invoices")
    .select("id, status, amount, enrollments(profiles(full_name))")
    .eq("code", code)
    .maybeSingle();
  if (!invoice) return { error: "Tagihan tidak ditemukan." };
  if (invoice.status !== "belum" && invoice.status !== "ditolak") return { error: "Tagihan ini tidak sedang menunggu pembayaran." };

  const { count } = await db.from("payment_proofs").select("id", { count: "exact", head: true }).eq("invoice_id", invoice.id);
  if ((count ?? 0) >= MAX_PROOFS) return { error: "Batas unggah untuk tagihan ini sudah habis. Kirim bukti lewat WhatsApp ke admin." };

  const path = `${invoice.id}/${Date.now()}.${ext}`;
  const { error: uploadError } = await db.storage
    .from("payment-proofs")
    .upload(path, file, { contentType: file.type });
  if (uploadError) {
    console.error("Upload bukti gagal", uploadError);
    return { error: "Upload gagal. Coba lagi atau kirim bukti lewat WhatsApp." };
  }

  // Status hanya pindah bila tagihan masih menunggu bayar; unggahan ganda yang
  // datang bersamaan tidak ikut tercatat dan filenya dihapus lagi.
  const { data: claimed } = await db
    .from("invoices")
    .update({ status: "menunggu_verifikasi", method, reject_reason: null })
    .eq("id", invoice.id)
    .in("status", ["belum", "ditolak"])
    .select("id");
  if (!claimed?.length) {
    await db.storage.from("payment-proofs").remove([path]);
    return { error: "Tagihan ini tidak sedang menunggu pembayaran." };
  }
  await db.from("payment_proofs").insert({ invoice_id: invoice.id, file_path: path });
  refresh();

  const name = (invoice.enrollments as unknown as { profiles: { full_name: string } }).profiles.full_name;
  await notifyAdmin(
    `Bukti bayar masuk: ${name} ${formatRupiah(invoice.amount)}`,
    `${name} mengunggah bukti ${method} untuk tagihan ${code} sebesar ${formatRupiah(invoice.amount)}.\nCocokkan dengan mutasi lalu verifikasi di halaman admin.`,
  ).catch(() => {});

  return { ok: true };
}
