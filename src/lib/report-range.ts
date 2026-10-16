// Rentang tanggal laporan (WIB). Bawaan: 3 bulan terakhir sampai hari ini.
export function reportRange(sp: Record<string, string | string[] | undefined>, now: number) {
  const iso = (v: unknown) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);
  const wib = new Date(now + 7 * 3600_000);
  const today = wib.toISOString().slice(0, 10);
  const threeMonthsAgo = new Date(Date.UTC(wib.getUTCFullYear(), wib.getUTCMonth() - 2, 1)).toISOString().slice(0, 10);
  let from = iso(sp.dari) ?? threeMonthsAgo;
  let to = iso(sp.sampai) ?? today;
  if (from > to) [from, to] = [to, from];
  return {
    from,
    to,
    fromIso: new Date(`${from}T00:00:00+07:00`).toISOString(),
    toIso: new Date(new Date(`${to}T00:00:00+07:00`).getTime() + 86400_000).toISOString(),
  };
}
