"use server";

import { refresh } from "next/cache";
import { requireAdmin, requireDb } from "@/lib/auth";

export async function setLeadStatus(leadId: string, status: "baru" | "dihubungi" | "daftar" | "batal") {
  await requireAdmin();
  await requireDb().from("leads").update({ status }).eq("id", leadId);
  refresh();
}

export async function setLeadNote(leadId: string, formData: FormData) {
  await requireAdmin();
  await requireDb()
    .from("leads")
    .update({ note: String(formData.get("note") ?? "").trim().slice(0, 300) || null })
    .eq("id", leadId);
  refresh();
}
