"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import type { FormState } from "@/app/admin/types";
import { requireAdmin, requireDb } from "@/lib/auth";

const certificationSchema = z.object({
  profile_id: z.uuid(),
  kind: z.enum(["N5", "N4", "N3", "JFT", "A1", "A2", "B1", "B2"]),
  passed: z.enum(["lulus", "tidak"]).transform((v) => v === "lulus"),
  exam_date: z.union([z.literal(""), z.iso.date()]),
});

export async function addCertification(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = certificationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Pilih siswa, jenis ujian, dan hasilnya." };
  const c = parsed.data;
  const { error } = await requireDb()
    .from("certifications")
    .insert({ profile_id: c.profile_id, kind: c.kind, passed: c.passed, exam_date: c.exam_date || null });
  if (error) return { error: error.message };
  refresh();
  return { ok: "Hasil ujian dicatat." };
}

export async function setCertificationBonus(id: string, paid: boolean) {
  await requireAdmin();
  await requireDb().from("certifications").update({ bonus_paid: paid }).eq("id", id);
  refresh();
}

export async function deleteCertification(id: string) {
  await requireAdmin();
  await requireDb().from("certifications").delete().eq("id", id);
  refresh();
}
