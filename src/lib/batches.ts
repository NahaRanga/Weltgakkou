import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export type OpenBatch = {
  id: string;
  name: string;
  start_date: string;
  schedule_label: string;
  quota: number;
  seatsLeft: number;
};

// Batch yang sedang membuka pendaftaran untuk satu program, dibaca langsung per request.
export async function getOpenBatches(programSlug: string): Promise<OpenBatch[]> {

  const db = getSupabaseAdmin();
  if (!db) return [];
  const { data: program } = await db.from("programs").select("id").eq("slug", programSlug).maybeSingle();
  if (!program) return [];

  const { data: batches } = await db
    .from("batches")
    .select("id, name, start_date, schedule_label, quota, enrollments(status)")
    .eq("program_id", program.id)
    .eq("mode", "live")
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

export type RecordingPackage = { batchId: string; price: number; months: number; videos: number };

// Paket rekaman video yang sedang dijual untuk satu program, bila ada.
export async function getRecordingPackage(programSlug: string): Promise<RecordingPackage | null> {
  const db = getSupabaseAdmin();
  if (!db) return null;
  const { data: program } = await db
    .from("programs")
    .select("id, recording_price, recording_months")
    .eq("slug", programSlug)
    .maybeSingle();
  if (!program?.recording_price) return null;
  const [{ data: batch }, { count }] = await Promise.all([
    db.from("batches").select("id").eq("program_id", program.id).eq("mode", "rekaman").eq("status", "buka").maybeSingle(),
    db.from("recordings").select("id", { count: "exact", head: true }).eq("program_id", program.id),
  ]);
  if (!batch) return null;
  return { batchId: batch.id, price: program.recording_price, months: program.recording_months, videos: count ?? 0 };
}
