import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { withBase } from "@/lib/base-path";
import { certificatePdf, toPdfText } from "@/lib/certificate-pdf";
import { loadCertificate } from "@/lib/certificates";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

// Unduh sertifikat PDF. Boleh: pemilik sertifikat, admin, dan pengajar batch itu.
export async function GET(request: NextRequest, ctx: RouteContext<"/belajar/sertifikat/[id]">) {
  const { id } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL(withBase("/masuk?next=/belajar"), request.url));
  const db = getSupabaseAdmin();
  if (!db || !/^[0-9a-f-]{36}$/.test(id)) return new Response("Sertifikat tidak ditemukan", { status: 404 });

  const cert = await loadCertificate(db, { enrollmentId: id });
  const allowed =
    cert && (cert.profileId === user.id || user.role === "admin" || (user.role === "pengajar" && cert.teacherId === user.id));
  if (!cert || !allowed) return new Response("Sertifikat tidak ditemukan", { status: 404 });

  const file = toPdfText(cert.name).replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "") || "siswa";
  return new Response(certificatePdf(cert), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Sertifikat-Weltgakko-${file}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
