import "server-only";
import { redirect } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getSupabaseAuth } from "@/lib/supabase-server";

export type Role = "siswa" | "pengajar" | "admin" | "admin_utama" | "finance" | "konten";

// admin_utama = admin + boleh menghapus siswa dan mengatur peran admin utama.
export function isAdminRole(role: string | null | undefined) {
  return role === "admin" || role === "admin_utama";
}

// Hanya admin utama dan finance yang boleh menghapus akun siswa.
export function canDeleteStudents(role: string | null | undefined) {
  return role === "admin_utama" || role === "finance";
}

export function roleLabel(role: string) {
  const labels: Record<string, string> = { admin_utama: "Admin utama", admin: "Admin", finance: "Finance", pengajar: "Pengajar", konten: "Konten", siswa: "Siswa" };
  return labels[role] ?? role;
}

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
  if (!isAdminRole(user.role)) redirect(user.role === "pengajar" || user.role === "finance" ? "/admin" : "/belajar");
  return user;
}

// Menu keuangan (pembayaran, siswa, laporan): admin, admin utama, finance.
export async function requireFinance() {
  const user = await requireUser("/admin");
  if (!isAdminRole(user.role) && user.role !== "finance") redirect(user.role === "pengajar" ? "/admin" : "/belajar");
  return user;
}

// Semua yang boleh membuka /admin (menu yang tampil tergantung peran).
export async function requireAdminArea() {
  const user = await requireUser("/admin");
  if (!isAdminRole(user.role) && user.role !== "pengajar" && user.role !== "finance") redirect("/belajar");
  return user;
}

// Admin dan pengajar boleh masuk /admin; pengajar hanya melihat batch yang ia ajar.
export async function requireStaff() {
  const user = await requireUser("/admin");
  if (user.role === "finance") redirect("/admin/pembayaran");
  if (!isAdminRole(user.role) && user.role !== "pengajar") redirect("/belajar");
  return user;
}

export function requireDb() {
  const db = getSupabaseAdmin();
  if (!db) throw new Error("SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY belum diisi");
  return db;
}
