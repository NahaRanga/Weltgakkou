"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireProgramStaff } from "@/app/admin/guards";
import type { FormState } from "@/app/admin/types";
import { requireAdmin, requireDb, requireStaff } from "@/lib/auth";

const recordingSchema = z.object({
  chapter: z.coerce.number().int().min(1).max(99),
  title: z.string().trim().min(2).max(120),
  url: z.string().trim().regex(/^https:\/\/\S+$/, "Link harus diawali https://"),
});

export async function addRecording(programId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireProgramStaff(programId);
  const parsed = recordingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Periksa lagi: bab (angka), judul, dan link https://." };
  const db = requireDb();
  const { count } = await db.from("recordings").select("id", { count: "exact", head: true }).eq("program_id", programId).eq("chapter", parsed.data.chapter);
  const { error } = await db.from("recordings").insert({ program_id: programId, ...parsed.data, position: count ?? 0, created_by: user.id });
  if (error) return { error: error.message };
  refresh();
  return { ok: `Video "${parsed.data.title}" ditambahkan ke bab ${parsed.data.chapter}.` };
}

export async function deleteRecording(recordingId: string) {
  await requireStaff();
  const db = requireDb();
  const { data } = await db.from("recordings").select("program_id").eq("id", recordingId).maybeSingle();
  if (!data) return;
  await requireProgramStaff(data.program_id);
  await db.from("recordings").delete().eq("id", recordingId);
  refresh();
}

// Paket rekaman dijual lewat batch khusus (mode rekaman) supaya pendaftaran dan
// pembayaran memakai alur yang sama dengan kelas live.
export async function setRecordingPackage(programId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const price = Number(String(formData.get("recording_price") ?? "").replace(/\D/g, ""));
  const months = Number(formData.get("recording_months") ?? 0);
  const open = formData.get("open") === "1";
  if (!price || price < 10_000) return { error: "Isi harga paket, minimal Rp10.000." };
  if (!Number.isInteger(months) || months < 1 || months > 36) return { error: "Lama akses 1 sampai 36 bulan." };
  const db = requireDb();
  await db.from("programs").update({ recording_price: price, recording_months: months }).eq("id", programId);

  const { data: existing } = await db.from("batches").select("id, status").eq("program_id", programId).eq("mode", "rekaman").maybeSingle();
  if (existing) {
    await db.from("batches").update({ status: open ? "buka" : "selesai" }).eq("id", existing.id);
  } else if (open) {
    const { error } = await db.from("batches").insert({
      program_id: programId,
      mode: "rekaman",
      name: "Paket rekaman",
      start_date: new Date().toISOString().slice(0, 10),
      schedule_label: "Belajar mandiri, kapan saja",
      quota: 100000,
      status: "buka",
    });
    if (error) return { error: error.message };
  }
  refresh();
  return { ok: open ? "Paket rekaman dibuka dan bisa dibeli dari halaman program." : "Paket rekaman disimpan dan ditutup." };
}
