"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { signOut } from "@/app/(site)/masuk/actions";
import { withBase } from "@/lib/base-path";

// Ikon garis 24px (gaya Heroicons outline).
const icons: Record<string, string> = {
  dashboard: "M3 12l9-9 9 9M5 10v10h5v-6h4v6h5V10",
  jadwal: "M8 3v3m8-3v3M4 8h16M5 5h14a1 1 0 011 1v13a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1z",
  batch: "M4 6h16M4 12h16M4 18h10",
  bayar: "M3 7h18v10H3zM3 10h18M7 15h3",
  siswa: "M16 11a4 4 0 10-8 0 4 4 0 008 0zM4 21a8 8 0 0116 0",
  sertifikat: "M12 15a5 5 0 100-10 5 5 0 000 10zm-3 4l3-2 3 2v-5.5M9 19v-5.5",
  waiting: "M12 7v5l3 2M12 21a9 9 0 100-18 9 9 0 000 18z",
  referral: "M8 12h8M12 8v8M4 12a8 8 0 1016 0 8 8 0 00-16 0z",
  laporan: "M4 20V10m6 10V4m6 16v-8m4 8H2",
  tim: "M17 20a5 5 0 00-10 0M12 12a4 4 0 100-8 4 4 0 000 8zm7 8a4 4 0 00-3-3.9M19 4.5a3.5 3.5 0 010 7",
  profil: "M12 12a4 4 0 100-8 4 4 0 000 8zm-8 9a8 8 0 0116 0",
  keluar: "M15 12H4m0 0l4-4m-4 4l4 4M14 4h5a1 1 0 011 1v14a1 1 0 01-1 1h-5",
  ciut: "M15 6l-6 6 6 6",
  menu: "M4 6h16M4 12h16M4 18h16",
};

function Icon({ name, className = "h-5 w-5" }: { name: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 ${className}`} aria-hidden>
      <path d={icons[name]} />
    </svg>
  );
}

export type NavItem = { href: string; label: string; icon: string; badge?: number };

export function AdminSidebar({ items, user }: { items: NavItem[]; user: { fullName: string; email: string; role: string } }) {
  const path = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [open, setOpen] = useState(false);
  const [leaving, startLeaving] = useTransition();

  // Status ciut disimpan per browser, seperti dashboard jiewastudio.
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCollapsed(localStorage.getItem("wg-admin-ciut") === "1");
    } catch {}
  }, []);

  function toggle() {
    setCollapsed((c) => {
      try {
        localStorage.setItem("wg-admin-ciut", c ? "0" : "1");
      } catch {}
      return !c;
    });
  }

  const isActive = (href: string) => (href === "/admin" ? path === "/admin" : path.startsWith(href));
  const roleLabel = user.role === "admin" ? "Admin" : user.role === "pengajar" ? "Pengajar" : user.role;
  const mini = collapsed && !open;

  return (
    <>
      {/* Bar atas di HP */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-stone-200 bg-white px-4 py-3 lg:hidden">
        <Link href="/admin" className="flex items-center gap-2 font-bold text-stone-900">
          <Image src={withBase("/logo-mark.png")} alt="" width={36} height={24} className="h-6 w-auto" />
          Weltgakkou
        </Link>
        <button onClick={() => setOpen(true)} className="rounded-lg p-2 text-stone-700 hover:bg-stone-100" aria-label="Buka menu">
          <Icon name="menu" />
        </button>
      </div>
      {open && <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={() => setOpen(false)} />}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-stone-200 bg-white transition-all lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        } ${mini ? "w-16" : "w-64"}`}
      >
        <div className={`flex items-center border-b border-stone-100 py-4 ${mini ? "justify-center px-2" : "justify-between px-4"}`}>
          <Link href="/admin" className="flex items-center gap-2 font-bold text-stone-900">
            <Image src={withBase("/logo-mark.png")} alt="Weltgakkou" width={42} height={28} className="h-7 w-auto" />
            {!mini && <span>Weltgakkou</span>}
          </Link>
          {!mini && (
            <button onClick={toggle} className="hidden rounded-lg p-1.5 text-stone-500 hover:bg-stone-100 lg:block" aria-label="Ciutkan menu" title="Ciutkan menu">
              <Icon name="ciut" className="h-4 w-4" />
            </button>
          )}
        </div>
        {mini && (
          <button onClick={toggle} className="mx-auto mt-2 hidden rounded-lg p-1.5 text-stone-500 hover:bg-stone-100 lg:block" aria-label="Lebarkan menu" title="Lebarkan menu">
            <Icon name="ciut" className="h-4 w-4 rotate-180" />
          </button>
        )}

        <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-3">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              title={mini ? item.label : undefined}
              onClick={() => setOpen(false)}
              className={`group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium ${
                isActive(item.href) ? "bg-stone-100 text-stone-900" : "text-stone-600 hover:bg-stone-50 hover:text-stone-900"
              } ${mini ? "justify-center px-0" : ""}`}
            >
              <Icon name={item.icon} />
              {!mini && <span className="flex-1">{item.label}</span>}
              {item.badge ? (
                <span className={`rounded-full bg-red-700 px-1.5 text-xs text-white ${mini ? "absolute right-1 top-0.5" : ""}`}>{item.badge}</span>
              ) : null}
            </Link>
          ))}
        </nav>

        <div className="border-t border-stone-100 p-3">
          {!mini && (
            <div className="mb-2 px-1">
              <p className="truncate text-sm font-semibold text-stone-900">{user.fullName}</p>
              <p className="truncate text-xs text-stone-500">
                {roleLabel} · {user.email}
              </p>
            </div>
          )}
          <Link
            href="/admin/profil"
            onClick={() => setOpen(false)}
            title={mini ? "Profil" : undefined}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-stone-600 hover:bg-stone-50 ${mini ? "justify-center px-0" : ""} ${isActive("/admin/profil") ? "bg-stone-100 text-stone-900" : ""}`}
          >
            <Icon name="profil" />
            {!mini && "Edit profil"}
          </Link>
          <Link href="/" title={mini ? "Lihat website" : undefined} className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-stone-600 hover:bg-stone-50 ${mini ? "justify-center px-0" : ""}`}>
            <Icon name="dashboard" />
            {!mini && "Lihat website"}
          </Link>
          <button
            onClick={() =>
              startLeaving(async () => {
                await signOut();
                window.location.assign(withBase("/masuk"));
              })
            }
            disabled={leaving}
            title={mini ? "Keluar" : undefined}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60 ${mini ? "justify-center px-0" : ""}`}
          >
            <Icon name="keluar" />
            {!mini && (leaving ? "Keluar..." : "Keluar")}
          </button>
        </div>
      </aside>
    </>
  );
}
