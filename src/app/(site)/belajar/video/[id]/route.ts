import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { withBase } from "@/lib/base-path";
import { canWatchProgram } from "@/lib/recordings";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

// Tombol "Tonton" di pustaka video: catat progres tontonan, lalu buka videonya.
export async function GET(request: NextRequest, ctx: RouteContext<"/belajar/video/[id]">) {
  const { id } = await ctx.params;
  const back = (q = "") => NextResponse.redirect(new URL(withBase(`/belajar${q}`), request.url));
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL(withBase("/masuk?next=/belajar"), request.url));
  const db = getSupabaseAdmin();
  if (!db || !/^[0-9a-f-]{36}$/.test(id)) return back();

  const { data: video } = await db.from("recordings").select("id, url, program_id").eq("id", id).maybeSingle();
  if (!video) return back();

  const isStaff = user.role === "admin" || user.role === "pengajar";
  if (!isStaff) {
    if (!(await canWatchProgram(db, user.id, video.program_id, Date.now()))) return back("?video=habis");
    await db
      .from("recording_views")
      .upsert({ recording_id: video.id, profile_id: user.id }, { onConflict: "recording_id,profile_id", ignoreDuplicates: true });
  }
  return NextResponse.redirect(video.url);
}
