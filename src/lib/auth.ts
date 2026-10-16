import "server-only";
import { redirect } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getSupabaseAuth } from "@/lib/supabase-server";

export type Role = "siswa" | "pengajar" | "admin" | "konten";

export type CurrentUser = {
  id: string;
  email: string;
  fullName: string;
  role: Role;
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const auth = await getSupabaseAuth();
  const db = getSupabaseAdmin();
  if (!auth || !db) return null;

  const { data } = await auth.auth.getUser();
  if (!data.user) return null;

  const { data: profile } = await db
    .from("profiles")
    .select("full_name, role")
    .eq("id", data.user.id)
    .maybeSingle();

  return {
    id: data.user.id,
    email: data.user.email ?? "",
    fullName: profile?.full_name ?? data.user.email ?? "",
    role: (profile?.role as Role) ?? "siswa",
  };
}

export async function requireUser(next: string) {
  const user = await getCurrentUser();
  if (!user) redirect(`/masuk?next=${encodeURIComponent(next)}`);
  return user;
}

export async function requireAdmin() {
  const user = await requireUser("/admin");
  if (user.role !== "admin") redirect(user.role === "pengajar" ? "/admin" : "/belajar");
  return user;
}

// Admin dan pengajar boleh masuk /admin; pengajar hanya melihat batch yang ia ajar.
export async function requireStaff() {
  const user = await requireUser("/admin");
  if (user.role !== "admin" && user.role !== "pengajar") redirect("/belajar");
  return user;
}

export function requireDb() {
  const db = getSupabaseAdmin();
  if (!db) throw new Error("SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY belum diisi");
  return db;
}
