const tz = "Asia/Jakarta";

export function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: tz,
  }).format(new Date(iso));
}

export function formatDate(iso: string) {
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: tz }).format(
    new Date(iso),
  );
}

export function siteUrl() {
  return (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

// Waktu saat request; halaman admin dan siswa selalu dirender per request.
export function requestTime() {
  return Date.now();
}

// "Minggu, 15 November 2026" (tanpa jam), untuk tenggat dan jadwal di banner.
export function formatDay(iso: string) {
  return new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: tz }).format(
    new Date(iso),
  );
}

// "19.30" WIB.
export function formatTime(iso: string) {
  return new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: tz }).format(new Date(iso));
}
