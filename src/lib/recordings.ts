import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

// Menonton rekaman pengganti setelah absen dicatat sebagai hadir (via rekaman)
// dan ikut dihitung untuk syarat sertifikat.
export const RECORDING_COUNTS_AS_PRESENT = true;

export type Recording = { id: string; chapter: number; title: string; url: string; position: number };

// Siswa boleh membuka pustaka video program bila punya pendaftaran yang aktif:
// kelas live yang aktif/selesai, atau paket rekaman yang masa aksesnya belum habis.
export async function canWatchProgram(db: SupabaseClient, profileId: string, programId: string, now: number) {
  const { data } = await db
    .from("enrollments")
    .select("status, access_until, batches!inner(mode, program_id)")
    .eq("profile_id", profileId)
    .eq("batches.program_id", programId)
    .in("status", ["aktif", "selesai"]);
  return (data ?? []).some((e) => {
    const mode = (e.batches as unknown as { mode: string }).mode;
    if (mode !== "rekaman") return true;
    return e.status === "aktif" && (!e.access_until || new Date(e.access_until).getTime() > now);
  });
}

export function groupByChapter<T extends { chapter: number; position: number; title: string }>(items: T[]) {
  const sorted = [...items].sort((a, b) => a.chapter - b.chapter || a.position - b.position || a.title.localeCompare(b.title));
  const chapters = new Map<number, T[]>();
  for (const r of sorted) chapters.set(r.chapter, [...(chapters.get(r.chapter) ?? []), r]);
  return [...chapters.entries()];
}
