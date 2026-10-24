import { requireDb } from "@/lib/auth";
import { csvResponse, requireAdminForExport, toCsv } from "@/lib/csv";
import { goalLabel } from "@/lib/seminars";

export async function GET(request: Request) {
  if (!(await requireAdminForExport())) return new Response("Hanya admin", { status: 403 });
  const id = new URL(request.url).searchParams.get("id") ?? "";
  if (!/^[0-9a-f-]{36}$/.test(id)) return new Response("id seminar tidak valid", { status: 400 });
  const { data } = await requireDb()
    .from("seminar_registrations")
    .select("full_name, whatsapp, email, city, goal, source, question, attended, note, created_at")
    .eq("seminar_id", id)
    .order("created_at");
  const body = toCsv(
    ["Nama", "WhatsApp", "Email", "Kota", "Tujuan", "Sumber", "Pertanyaan", "Hadir", "Catatan", "Tanggal daftar"],
    (data ?? []).map((r) => [r.full_name, r.whatsapp, r.email, r.city, goalLabel(r.goal), r.source, r.question, r.attended ? "ya" : "", r.note, r.created_at]),
  );
  return csvResponse("seminar-weltgakko.csv", body);
}
