import type { Metadata } from "next";
import { AdminSidebar, type NavItem } from "@/components/admin/sidebar";
import { isAdminRole, requireAdminArea, requireDb, roleLabel } from "@/lib/auth";
import { expireOverdueInvoices } from "@/lib/billing";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · Admin Weltgakko" }, robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdminArea();
  const db = requireDb();

  let items: NavItem[];
  if (isAdminRole(user.role)) {
    await expireOverdueInvoices(db);
    // Angka merah di menu: hal yang menunggu tindakan admin.
    const [proofs, leads] = await Promise.all([
      db.from("invoices").select("id", { count: "exact", head: true }).eq("status", "menunggu_verifikasi"),
      db.from("leads").select("id", { count: "exact", head: true }).eq("status", "baru"),
    ]);
    items = [
      { href: "/admin", label: "Dashboard", icon: "dashboard" },
      { href: "/admin/jadwal", label: "Jadwal", icon: "jadwal" },
      { href: "/admin/batch", label: "Batch & kelas", icon: "batch" },
      { href: "/admin/rekaman", label: "Video rekaman", icon: "video" },
      { href: "/admin/latihan", label: "Latihan gratis", icon: "latihan" },
      { href: "/admin/pembayaran", label: "Pembayaran", icon: "bayar", badge: proofs.count ?? 0 },
      { href: "/admin/siswa", label: "Siswa", icon: "siswa" },
      { href: "/admin/sertifikasi", label: "Sertifikasi", icon: "sertifikat" },
      { href: "/admin/waiting-list", label: "Waiting list", icon: "waiting", badge: leads.count ?? 0 },
      { href: "/admin/referral", label: "Referral", icon: "referral" },
      { href: "/admin/laporan", label: "Laporan", icon: "laporan" },
      { href: "/admin/tim", label: "Tim", icon: "tim" },
    ];
  } else if (user.role === "finance") {
    await expireOverdueInvoices(db);
    const proofs = await db.from("invoices").select("id", { count: "exact", head: true }).eq("status", "menunggu_verifikasi");
    items = [
      { href: "/admin/pembayaran", label: "Pembayaran", icon: "bayar", badge: proofs.count ?? 0 },
      { href: "/admin/siswa", label: "Siswa", icon: "siswa" },
      { href: "/admin/laporan", label: "Laporan", icon: "laporan" },
    ];
  } else {
    items = [
      { href: "/admin", label: "Dashboard", icon: "dashboard" },
      { href: "/admin/jadwal", label: "Jadwal", icon: "jadwal" },
      { href: "/admin/batch", label: "Kelas saya", icon: "batch" },
      { href: "/admin/rekaman", label: "Video rekaman", icon: "video" },
    ];
  }

  return (
    <div className="min-h-screen bg-stone-50 lg:flex">
      <AdminSidebar items={items} user={{ fullName: user.fullName, email: user.email, roleLabel: roleLabel(user.role) }} />
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:p-8">{children}</main>
    </div>
  );
}
