"use server";

import { refresh } from "next/cache";
import { requireAdmin, requireDb } from "@/lib/auth";
import { reminderKinds, type ReminderKind } from "@/lib/seminars";

const httpsUrl = (v: FormDataEntryValue | null) => {
  const url = String(v ?? "").trim();
  return /^https:\/\//.test(url) ? url.slice(0, 500) : null;
};

// Tanggal (YYYY-MM-DD) + jam (HH:MM) WIB jadi timestamp; kosong/tidak valid = null.
function wibTimestamp(date: FormDataEntryValue | null, time: FormDataEntryValue | null) {
  const d = String(date ?? "");
  const t = String(time ?? "") || "10:00";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || !/^\d{2}:\d{2}$/.test(t)) return null;
  return `${d}T${t}:00+07:00`;
}

// Ubah pengaturan satu seminar: link Zoom, kuota, buka/tutup pendaftaran.
export async function updateSeminar(seminarId: string, formData: FormData) {
  await requireAdmin();
  const quota = Number(formData.get("quota"));
  await requireDb()
    .from("seminars")
    .update({
      meeting_url: httpsUrl(formData.get("meeting_url")),
      quota: Number.isInteger(quota) && quota > 0 ? quota : null,
      is_open: formData.get("is_open") === "on",
      // Field trial hanya ada di form setelah migrasi 0012 jalan.
      ...(formData.has("trial_date") && {
        trial_starts_at: wibTimestamp(formData.get("trial_date"), formData.get("trial_time")),
        trial_meeting_url: httpsUrl(formData.get("trial_meeting_url")),
      }),
    })
    .eq("id", seminarId);
  refresh();
}

// Jadwal seminar baru; tanggal + jam diisi dalam WIB.
export async function createSeminar(formData: FormData) {
  await requireAdmin();
  const title = String(formData.get("title") ?? "").trim().slice(0, 120) || "Mengenal Jepang Lebih Dekat";
  const starts_at = wibTimestamp(formData.get("date"), formData.get("time"));
  if (!starts_at) return;
  const trial_starts_at = wibTimestamp(formData.get("trial_date"), formData.get("trial_time"));
  await requireDb()
    .from("seminars")
    .insert({ title, starts_at, ...(trial_starts_at && { trial_starts_at }) });
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

export async function setSeminarAttended(registrationId: string, column: "attended" | "trial_attended", value: boolean) {
  await requireAdmin();
  await requireDb().from("seminar_registrations").update({ [column]: value }).eq("id", registrationId);
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
