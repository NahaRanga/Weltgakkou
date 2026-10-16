"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/admin", label: "Ringkasan" },
  { href: "/admin/pembayaran", label: "Pembayaran" },
  { href: "/admin/batch", label: "Batch & kelas" },
  { href: "/admin/siswa", label: "Siswa" },
  { href: "/admin/waiting-list", label: "Waiting list" },
  { href: "/admin/tim", label: "Tim" },
];

export function AdminNav({ badges }: { badges: Record<string, number> }) {
  const path = usePathname();
  return (
    <nav className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-2 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0">
      {items.map((item) => {
        const active = item.href === "/admin" ? path === "/admin" : path.startsWith(item.href);
        const badge = badges[item.href];
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex shrink-0 items-center justify-between gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium ${
              active ? "bg-stone-900 text-white" : "text-stone-700 hover:bg-stone-200/60"
            }`}
          >
            {item.label}
            {badge ? <span className={`rounded-full px-1.5 text-xs ${active ? "bg-white/20" : "bg-red-700 text-white"}`}>{badge}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}
