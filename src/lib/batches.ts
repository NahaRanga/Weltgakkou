import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export type OpenBatch = {
  id: string;
  name: string;
  start_date: string;
  schedule_label: string;
  quota: number;
  seatsLeft: number;
};

// Batch yang sedang membuka pendaftaran untuk satu program. Di-cache beberapa menit
// supaya halaman program tetap cepat; admin memanggil revalidateTag("batches").
export async function getOpenBatches(programSlug: string): Promise<OpenBatch[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("batches");

  const db = getSupabaseAdmin();
  if (!db) return [];
  const { data: program } = await db.from("programs").select("id").eq("slug", programSlug).maybeSingle();
  if (!program) return [];

  const { data: batches } = await db
    .from("batches")
    .select("id, name, start_date, schedule_label, quota, enrollments(status)")
    .eq("program_id", program.id)
    .eq("status", "buka")
    .order("start_date");

  return (batches ?? []).map((b) => {
    const taken = (b.enrollments as { status: string }[]).filter((e) => e.status === "menunggu_bayar" || e.status === "aktif").length;
    return {
      id: b.id,
      name: b.name,
      start_date: b.start_date,
      schedule_label: b.schedule_label,
      quota: b.quota,
      seatsLeft: Math.max(0, b.quota - taken),
    };
  });
}
