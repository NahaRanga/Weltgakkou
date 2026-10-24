// Materi belajar siswa dibuka bertahap: semua pertemuan yang sudah lewat
// plus beberapa kelas berikutnya, supaya siswa bisa belajar duluan tanpa
// menerima seluruh isi kursus sekaligus. Ubah angka ini untuk memperlebar/mempersempit.
export const MATERIAL_LOOKAHEAD = 3;

// Kelas dianggap masih "berikutnya" sampai 2 jam setelah mulai (sama dengan tombol Masuk kelas).
const CLASS_LENGTH_MS = 2 * 3600_000;

export type MaterialRow = {
  id: string;
  title: string;
  kind: string;
  url: string;
  session_id: string | null;
  program_id: string | null;
  // Kolom dari migrasi 0011; undefined bila migrasi belum dijalankan.
  meeting_no?: number | null;
};

type SessionLike = { id: string; number: number; starts_at: string; kind: string; topic: string | null };

export type PlacedMaterial = MaterialRow & {
  // Sesi tempat materi ini dipakai; null = materi umum (selalu terbuka).
  session: SessionLike | null;
  // Nomor kelas (urutan sesi kelas, tanpa tes Jumat).
  classNo: number | null;
  open: boolean;
};

// Menempatkan materi ke sesi batch dan menentukan mana yang sudah terbuka.
// Materi program dengan meeting_no dipasang ke sesi kelas ke-N batch ini;
// materi sesi langsung ke sesinya. Materi untuk kelas yang tidak ada di batch dibuang.
export function placeMaterials(materials: MaterialRow[], sessions: SessionLike[], now: number) {
  const sorted = [...sessions].sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const classes = sorted.filter((s) => s.kind === "kelas");
  const classNoById = new Map(classes.map((s, i) => [s.id, i + 1]));
  const upcoming = classes.filter((s) => new Date(s.starts_at).getTime() + CLASS_LENGTH_MS > now);
  // Batas buka = jadwal kelas ke-N berikutnya; tes Jumat sebelum batas ikut terbuka.
  const limit = upcoming[MATERIAL_LOOKAHEAD - 1];
  const openUntil = limit ? new Date(limit.starts_at).getTime() : Infinity;
  const byId = new Map(sorted.map((s) => [s.id, s]));

  const placed: PlacedMaterial[] = [];
  for (const m of materials) {
    let session: SessionLike | null = null;
    if (m.session_id) session = byId.get(m.session_id) ?? null;
    else if (m.meeting_no) session = classes[m.meeting_no - 1] ?? null;
    if ((m.session_id || m.meeting_no) && !session) continue;
    placed.push({
      ...m,
      session,
      classNo: session ? (classNoById.get(session.id) ?? null) : null,
      open: !session || new Date(session.starts_at).getTime() <= openUntil,
    });
  }
  placed.sort((a, b) => (a.session?.starts_at ?? "").localeCompare(b.session?.starts_at ?? ""));
  return {
    general: placed.filter((m) => !m.session),
    open: placed.filter((m) => m.session && m.open),
    locked: placed.filter((m) => m.session && !m.open),
  };
}
