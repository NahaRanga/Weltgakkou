import "server-only";
import { isAdminRole, requireDb, requireStaff } from "@/lib/auth";

// Penjaga akses untuk server action admin. Sengaja tidak di file "use server"
// supaya tidak ikut terbuka sebagai action yang bisa dipanggil dari browser.

// Pengajar hanya boleh mengubah batch yang ia ajar; admin boleh semua.
export async function requireBatchStaff(batchId: string) {
  const user = await requireStaff();
  if (isAdminRole(user.role)) return user;
  const { data } = await requireDb().from("batches").select("teacher_id").eq("id", batchId).maybeSingle();
  if (!data || data.teacher_id !== user.id) throw new Error("Batch ini bukan kelas Anda.");
  return user;
}

export async function requireSessionStaff(sessionId: string) {
  // Cek login staf dulu sebelum membaca data sesi.
  await requireStaff();
  const { data } = await requireDb().from("sessions").select("batch_id").eq("id", sessionId).maybeSingle();
  if (!data) throw new Error("Sesi tidak ditemukan.");
  return requireBatchStaff(data.batch_id);
}

// Pustaka video per program. Admin boleh semua program; pengajar hanya program
// yang punya batch yang ia ajar.
export async function requireProgramStaff(programId: string) {
  const user = await requireStaff();
  if (isAdminRole(user.role)) return user;
  const { count } = await requireDb()
    .from("batches")
    .select("id", { count: "exact", head: true })
    .eq("program_id", programId)
    .eq("teacher_id", user.id);
  if (!count) throw new Error("Program ini bukan kelas Anda.");
  return user;
}
