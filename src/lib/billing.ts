import "server-only";
import { randomInt } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function newInvoiceCode() {
  let code = "WG";
  for (let i = 0; i < 8; i++) code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return code;
}

// Membuat tagihan dengan kode unik 1-999 yang ditambahkan ke nominal, sehingga
// setiap transfer bisa dicocokkan ke satu tagihan dari mutasi rekening.
export async function createInvoice(
  db: SupabaseClient,
  input: { enrollmentId: string; baseAmount: number; installmentNo: number; dueInHours: number },
) {
  for (let attempt = 0; attempt < 8; attempt++) {
    const uniqueCode = randomInt(1, 1000);
    const { data, error } = await db
      .from("invoices")
      .insert({
        enrollment_id: input.enrollmentId,
        code: newInvoiceCode(),
        amount: input.baseAmount + uniqueCode,
        unique_code: uniqueCode,
        installment_no: input.installmentNo,
        due_at: new Date(Date.now() + input.dueInHours * 3600_000).toISOString(),
      })
      .select("code")
      .single();
    if (!error) return data.code as string;
    // 23505 = kode unik bentrok dengan tagihan aktif lain; coba angka lain.
    if (error.code !== "23505") throw error;
  }
  throw new Error("Tidak menemukan kode unik yang kosong");
}

// Tagihan yang lewat batas waktu dianggap kedaluwarsa. Bila itu tagihan pertama,
// pendaftarannya batal dan kursi di batch dilepas.
export async function expireOverdueInvoices(db: SupabaseClient) {
  const { data } = await db
    .from("invoices")
    .update({ status: "kedaluwarsa" })
    .eq("status", "belum")
    .lt("due_at", new Date().toISOString())
    .select("enrollment_id, installment_no");

  const firstInstallments = (data ?? []).filter((i) => i.installment_no === 1).map((i) => i.enrollment_id);
  if (firstInstallments.length) {
    await db.from("enrollments").update({ status: "keluar" }).in("id", firstInstallments).eq("status", "menunggu_bayar");
  }
}

export async function seatsTaken(db: SupabaseClient, batchId: string) {
  const { count } = await db
    .from("enrollments")
    .select("id", { count: "exact", head: true })
    .eq("batch_id", batchId)
    .in("status", ["menunggu_bayar", "aktif"]);
  return count ?? 0;
}
