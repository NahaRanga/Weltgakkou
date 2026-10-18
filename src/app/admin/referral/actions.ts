"use server";

import { refresh } from "next/cache";
import { requireAdmin, requireDb } from "@/lib/auth";

export async function setReferralPaid(referralId: string, paid: boolean) {
  await requireAdmin();
  await requireDb().from("referrals").update({ paid }).eq("id", referralId);
  refresh();
}
