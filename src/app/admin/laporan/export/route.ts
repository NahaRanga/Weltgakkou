import type { NextRequest } from "next/server";
import { requireDb } from "@/lib/auth";
import { csvResponse, requireAdminForExport, toCsv } from "@/lib/csv";
import { reportRange } from "@/lib/report-range";

type Row = {
  status: string;
  plan: string;
  referral_code: string | null;
  created_at: string;
  profiles: { full_name: string; whatsapp: string | null; email: string | null; domicile: string | null; learning_goal: string | null };
  batches: { name: string; programs: { name: string } };
  invoices: { amount: number; status: string }[];
};

// Pendaftaran dalam rentang laporan, lengkap dengan total yang sudah dibayar.
export async function GET(request: NextRequest) {
  if (!(await requireAdminForExport())) return new Response("Hanya admin", { status: 403 });
  const range = reportRange(Object.fromEntries(request.nextUrl.searchParams), Date.now());
  const { data } = await requireDb()
    .from("enrollments")
    .select("status, plan, referral_code, created_at, profiles(full_name, whatsapp, email, domicile, learning_goal), batches(name, programs(name)), invoices(amount, status)")
    .gte("created_at", range.fromIso)
    .lt("created_at", range.toIso)
    .order("created_at");
  const rows = (data ?? []) as unknown as Row[];
  const body = toCsv(
    ["Tanggal daftar", "Nama", "WhatsApp", "Email", "Domisili", "Tujuan", "Program", "Batch", "Status", "Cara bayar", "Kode referral", "Sudah dibayar"],
    rows.map((r) => [
      r.created_at,
      r.profiles.full_name,
      r.profiles.whatsapp,
      r.profiles.email,
      r.profiles.domicile,
      r.profiles.learning_goal,
      r.batches.programs.name,
      r.batches.name,
      r.status,
      r.plan,
      r.referral_code,
      r.invoices.filter((i) => i.status === "lunas").reduce((s, i) => s + i.amount, 0),
    ]),
  );
  return csvResponse(`pendaftaran-${range.from}-sd-${range.to}.csv`, body);
}
