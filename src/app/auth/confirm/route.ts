import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAuth } from "@/lib/supabase-server";
import { withBase } from "@/lib/base-path";

// Link dari email atur password: tukar token menjadi sesi login, lalu ke form password.
export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");
  const auth = await getSupabaseAuth();

  if (auth && tokenHash && type === "recovery") {
    const { error } = await auth.auth.verifyOtp({ type: "recovery", token_hash: tokenHash });
    if (!error) return NextResponse.redirect(new URL(withBase("/atur-password"), request.url));
  }
  return NextResponse.redirect(new URL(withBase("/masuk/lupa?expired=1"), request.url));
}
