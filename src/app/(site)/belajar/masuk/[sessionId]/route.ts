import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser, isAdminRole } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { withBase } from "@/lib/base-path";

// Tombol "Masuk kelas": catat kehadiran, lalu arahkan ke link kelas (Zoom/Meet).
// Link kelas tidak pernah tampil di halaman publik.
export async function GET(request: NextRequest, ctx: RouteContext<"/belajar/masuk/[sessionId]">) {
  const { sessionId } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL(withBase(`/masuk?next=/belajar`), request.url));

  const db = getSupabaseAdmin();
  if (!db) return NextResponse.redirect(new URL(withBase("/belajar"), request.url));

  const { data: session } = await db
    .from("sessions")
    .select("id, starts_at, meeting_url, batch_id, batches(meeting_url)")
    .eq("id", sessionId)
    .maybeSingle();
  if (!session) return NextResponse.redirect(new URL(withBase("/belajar"), request.url));

  const { data: enrollment } = await db
    .from("enrollments")
    .select("id")
    .eq("profile_id", user.id)
    .eq("batch_id", session.batch_id)
    .eq("status", "aktif")
    .maybeSingle();
  const isStaff = isAdminRole(user.role) || user.role === "pengajar";
  if (!enrollment && !isStaff) return NextResponse.redirect(new URL(withBase("/belajar"), request.url));

  const url = session.meeting_url ?? (session.batches as unknown as { meeting_url: string | null }).meeting_url;
  if (!url) return NextResponse.redirect(new URL(withBase("/belajar?meet=belum"), request.url));

  if (enrollment) {
    await db
      .from("attendance")
      .upsert({ session_id: session.id, profile_id: user.id, present: true }, { onConflict: "session_id,profile_id", ignoreDuplicates: true });
  }
  return NextResponse.redirect(url);
}
