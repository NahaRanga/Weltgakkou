import type { Metadata } from "next";
import { AdminNav } from "@/components/admin/nav";
import { requireAdmin, requireDb } from "@/lib/auth";
import { expireOverdueInvoices } from "@/lib/billing";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · Admin" }, robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  const db = requireDb();
  await expireOverdueInvoices(db);

  // Angka merah di menu: hal yang menunggu tindakan admin.
  const [proofs, leads] = await Promise.all([
    db.from("invoices").select("id", { count: "exact", head: true }).eq("status", "menunggu_verifikasi"),
    db.from("leads").select("id", { count: "exact", head: true }).eq("status", "baru"),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 lg:grid lg:grid-cols-[200px_1fr] lg:gap-8 lg:py-10">
      <aside className="mb-6 lg:mb-0">
        <p className="mb-3 hidden text-xs font-semibold uppercase tracking-wide text-stone-500 lg:block">Admin · {admin.fullName}</p>
        <div className="lg:sticky lg:top-6">
          <AdminNav badges={{ "/admin/pembayaran": proofs.count ?? 0, "/admin/waiting-list": leads.count ?? 0 }} />
        </div>
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
