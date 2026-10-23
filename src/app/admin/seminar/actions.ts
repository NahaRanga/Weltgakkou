"use server";

import { refresh } from "next/cache";
import { requireAdmin, requireDb } from "@/lib/auth";
import { reminderKinds, type ReminderKind } from "@/lib/seminars";

// Ubah pengaturan satu seminar: link Zoom, kuota, buka/tutup pendaftaran.
export async function updateSeminar(seminarId: string, formData: FormData) {
  await requireAdmin();
  const url = String(formData.get("meeting_url") ?? "").trim();
  const quota = Number(formData.get("quota"));
  await requireDb()
    .from("seminars")
    .update({
      meeting_url: /^https:\/\//.test(url) ? url.slice(0, 500) : null,
      quota: Number.isInteger(quota) && quota > 0 ? quota : null,
      is_open: formData.get("is_open") === "on",
    })
    .eq("id", seminarId);
  refresh();
}

// Jadwal seminar baru; tanggal + jam diisi dalam WIB.
export async function createSeminar(formData: FormData) {
  await requireAdmin();
  const title = String(formData.get("title") ?? "").trim().slice(0, 120) || "Mengenal Jepang Lebih Dekat";
  const date = String(formData.get("date") ?? "");
  const time = String(formData.get("time") ?? "17:00");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return;
  await requireDb().from("seminars").insert({ title, starts_at: `${date}T${time}:00+07:00` });
  refresh();
}

// Tandai pesan WA sudah dikirim (dipanggil saat admin klik tombol WA). `undo` menghapus tanda.
export async function markSeminarSent(registrationId: string, kind: ReminderKind, undo = false) {
  await requireAdmin();
  await requireDb()
    .from("seminar_registrations")
    .update({ [reminderKinds[kind].column]: undo ? null : new Date().toISOString() })
    .eq("id", registrationId);
  refresh();
}

export async function setSeminarAttended(registrationId: string, attended: boolean) {
  await requireAdmin();
  await requireDb().from("seminar_registrations").update({ attended }).eq("id", registrationId);
  refresh();
}

export async function setSeminarNote(registrationId: string, formData: FormData) {
  await requireAdmin();
  await requireDb()
    .from("seminar_registrations")
    .update({ note: String(formData.get("note") ?? "").trim().slice(0, 300) || null })
    .eq("id", registrationId);
  refresh();
}
