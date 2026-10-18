import "server-only";
import { getCurrentUser } from "@/lib/auth";

// CSV dengan pemisah titik koma dan BOM, supaya langsung rapi saat dibuka di Excel versi Indonesia.
export function toCsv(header: string[], rows: (string | number | boolean | null | undefined)[][]) {
  const cell = (v: string | number | boolean | null | undefined) => {
    let s = v === null || v === undefined ? "" : String(v);
    // Cegah CSV injection: teks dari pengunjung (nama, catatan) yang diawali = + - @ tab
    // atau CR bisa dijalankan Excel sebagai rumus, jadi diberi awalan kutip tunggal.
    if (typeof v === "string" && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return "﻿" + [header, ...rows].map((r) => r.map(cell).join(";")).join("\r\n");
}

export function csvResponse(filename: string, body: string) {
  return new Response(body, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${filename}"`, "Cache-Control": "no-store" },
  });
}

export async function requireAdminForExport() {
  const user = await getCurrentUser();
  return user?.role === "admin" ? user : null;
}
