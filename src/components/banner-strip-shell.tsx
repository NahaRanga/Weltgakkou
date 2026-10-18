"use client";

import { usePathname } from "next/navigation";

// Pita batch tidak ditampilkan di halaman yang sedang daftar/bayar/belajar supaya tidak mengganggu.
const HIDDEN = /^\/(daftar|bayar|belajar|masuk|atur-password|trial)(\/|$)/;

export function BannerStripShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (HIDDEN.test(pathname)) return null;
  return children;
}
