import { requireDb } from "@/lib/auth";
import { csvResponse, requireAdminForExport, toCsv } from "@/lib/csv";

export async function GET() {
  if (!(await requireAdminForExport())) return new Response("Hanya admin", { status: 403 });
  const { data } = await requireDb()
    .from("leads")
    .select("full_name, whatsapp, email, program_slug, source, referral_code, status, note, created_at")
    .order("created_at", { ascending: false });
  const body = toCsv(
    ["Nama", "WhatsApp", "Email", "Program", "Sumber", "Kode referral", "Status", "Catatan", "Tanggal masuk"],
    (data ?? []).map((l) => [l.full_name, l.whatsapp, l.email, l.program_slug, l.source, l.referral_code, l.status, l.note, l.created_at]),
  );
  return csvResponse("waiting-list-weltgakkou.csv", body);
}
