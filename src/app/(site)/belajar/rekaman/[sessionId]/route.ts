import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser, isAdminRole } from "@/lib/auth";
import { withBase } from "@/lib/base-path";
import { RECORDING_COUNTS_AS_PRESENT } from "@/lib/recordings";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

// Rekaman satu sesi kelas live. Siswa yang absen di sesi itu tercatat hadir
// via rekaman saat membukanya; siswa yang sudah hadir live tidak berubah.
export async function GET(request: NextRequest, ctx: RouteContext<"/belajar/rekaman/[sessionId]">) {
  const { sessionId } = await ctx.params;
  const back = () => NextResponse.redirect(new URL(withBase("/belajar"), request.url));
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL(withBase("/masuk?next=/belajar"), request.url));
  const db = getSupabaseAdmin();
  if (!db || !/^[0-9a-f-]{36}$/.test(sessionId)) return back();

  const { data: session } = await db
    .from("sessions")
    .select("id, kind, starts_at, recording_url, batch_id")
    .eq("id", sessionId)
    .maybeSingle();
  if (!session?.recording_url) return back();

  const { data: enrollment } = await db
    .from("enrollments")
    .select("id")
    .eq("profile_id", user.id)
    .eq("batch_id", session.batch_id)
    .in("status", ["aktif", "selesai"])
    .maybeSingle();
  const isStaff = isAdminRole(user.role) || user.role === "pengajar";
  if (!enrollment && !isStaff) return back();

  const started = new Date(session.starts_at).getTime() <= Date.now();
  if (enrollment && RECORDING_COUNTS_AS_PRESENT && session.kind === "kelas" && started) {
    await db
      .from("attendance")
      .upsert(
        { session_id: session.id, profile_id: user.id, present: true, via: "rekaman" },
        { onConflict: "session_id,profile_id", ignoreDuplicates: true },
      );
  }
  return NextResponse.redirect(session.recording_url);
}
