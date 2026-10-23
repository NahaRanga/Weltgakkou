import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { formatDay, formatTime, requestTime } from "@/lib/format";

export type Seminar = {
  id: string;
  title: string;
  starts_at: string;
  duration_minutes: number;
  meeting_url: string | null;
  quota: number | null;
  is_open: boolean;
};

export type OpenSeminar = Seminar & { registered: number; full: boolean };

// Seminar yang masih bisa didaftari: belum mulai dan dibuka admin.
// Kalau tabel belum ada (migrasi 0008 belum jalan) hasilnya kosong, bukan error.
export async function upcomingSeminars(db: SupabaseClient | null = getSupabaseAdmin()): Promise<OpenSeminar[]> {
  if (!db) return [];
  const { data, error } = await db
    .from("seminars")
    .select("id, title, starts_at, duration_minutes, meeting_url, quota, is_open")
    .eq("is_open", true)
    .gt("starts_at", new Date(requestTime()).toISOString())
    .order("starts_at");
  if (error || !data?.length) return [];

  const { data: regs } = await db
    .from("seminar_registrations")
    .select("seminar_id")
    .in("seminar_id", data.map((s) => s.id));
  const counts = new Map<string, number>();
  for (const r of regs ?? []) counts.set(r.seminar_id, (counts.get(r.seminar_id) ?? 0) + 1);

  return (data as Seminar[]).map((s) => {
    const registered = counts.get(s.id) ?? 0;
    return { ...s, registered, full: s.quota != null && registered >= s.quota };
  });
}

export const seminarWhen = (s: Pick<Seminar, "starts_at">) => `${formatDay(s.starts_at)}, ${formatTime(s.starts_at)} WIB`;

// Link "Simpan ke Google Calendar" untuk peserta.
export function calendarLink(s: Pick<Seminar, "title" | "starts_at" | "duration_minutes">) {
  const fmt = (ms: number) => new Date(ms).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const start = new Date(s.starts_at).getTime();
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `Seminar gratis Weltgakko: ${s.title}`,
    dates: `${fmt(start)}/${fmt(start + s.duration_minutes * 60_000)}`,
    details: "Seminar online lewat Zoom. Link Zoom dikirim admin Weltgakko lewat WhatsApp H-1 dan 1 jam sebelum mulai.",
    location: "Zoom",
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

export const goals = [
  { value: "kerja", label: "Kerja di Jepang (SSW / magang)" },
  { value: "kuliah", label: "Kuliah atau beasiswa" },
  { value: "hobi", label: "Hobi, anime, atau wisata" },
  { value: "belum", label: "Masih cari tahu" },
] as const;

export const goalLabel = (v: string | null) => goals.find((g) => g.value === v)?.label ?? v ?? "";

// Jenis pesan WA yang dikirim admin, berikut kolom penanda "sudah dikirim".
export const reminderKinds = {
  konfirmasi: { label: "Konfirmasi", column: "confirmed_at" },
  h1: { label: "H-1", column: "reminded_h1_at" },
  h0: { label: "1 jam lagi", column: "reminded_h0_at" },
  followup: { label: "Follow-up", column: "followed_up_at" },
} as const;
export type ReminderKind = keyof typeof reminderKinds;

// Teks pesan WhatsApp siap kirim. `name` kosong = versi broadcast.
export function seminarMessage(kind: ReminderKind, s: Seminar, opts: { name?: string; attended?: boolean } = {}) {
  const hi = opts.name ? `Halo ${opts.name.split(" ")[0]}` : "Halo";
  const zoom = s.meeting_url ?? "[link Zoom]";
  const day = formatDay(s.starts_at);
  const time = `${formatTime(s.starts_at)} WIB`;
  switch (kind) {
    case "konfirmasi":
      return [
        `${hi}, terima kasih sudah daftar seminar gratis "${s.title}" dari Weltgakko.`,
        "",
        `Jadwal: ${day}`,
        `Jam: ${time}`,
        "Tempat: Zoom (online)",
        "",
        "Link Zoom kami kirim lewat chat ini H-1 dan 1 jam sebelum mulai. Simpan nomor ini ya, biar link-nya bisa langsung diklik. Sampai ketemu!",
      ].join("\n");
    case "h1":
      return [
        `${hi}, pengingat: besok ada seminar gratis "${s.title}" dari Weltgakko.`,
        "",
        `${day}, ${time}`,
        `Link Zoom: ${zoom}`,
        "",
        "Ruang Zoom dibuka 10 menit sebelum mulai. Siapkan pertanyaan seputar Jepang yang mau kamu tanyakan ya!",
      ].join("\n");
    case "h0":
      return [
        `${hi}, 1 jam lagi seminar "${s.title}" dimulai (${time}).`,
        "",
        `Link Zoom: ${zoom}`,
        "",
        "Pakai nama asli di Zoom biar gampang kami absen. Sampai ketemu sebentar lagi!",
      ].join("\n");
    case "followup":
      return opts.attended === false
        ? [
            `${hi}, kemarin belum sempat ikut seminar "${s.title}" ya? Nggak apa-apa.`,
            "",
            "Kamu tetap bisa coba kelas trial bahasa Jepang gratis lewat Zoom: https://weltgakko.com/trial",
            "Atau balas chat ini kalau mau dikabari jadwal seminar berikutnya.",
          ].join("\n")
        : [
            `${hi}, terima kasih sudah ikut seminar "${s.title}" bareng Weltgakko!`,
            "",
            "Kalau mau langsung coba belajar, ada kelas trial gratis lewat Zoom: https://weltgakko.com/trial",
            "Batch 1 JLPT N5 mulai Senin, 16 November 2026. Info dan daftar: https://weltgakko.com/program/jlpt-n5",
            "",
            "Ada yang mau ditanyakan? Balas aja chat ini.",
          ].join("\n");
  }
}
