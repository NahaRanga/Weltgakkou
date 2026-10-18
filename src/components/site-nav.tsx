"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { SignOutButton } from "@/components/auth-forms";
import { infoPages, trialHref } from "@/lib/info-pages";

const main = [
  { href: "/", label: "Beranda" },
  { href: "/#program", label: "Program" },
  ...infoPages.slice(0, 3).map((p) => ({ href: p.href, label: p.menu })),
  { href: "/latihan", label: "Latihan" },
];

// Isi dropdown "Info": sisa halaman info + FAQ, ditutup dengan link ke halaman ringkasan /info.
const more = [
  ...infoPages.slice(3, 5).map((p) => ({ href: p.href, label: p.menu })),
  { href: "/faq", label: "FAQ" },
  ...infoPages.slice(5).map((p) => ({ href: p.href, label: p.menu })),
];

type Account = { href: string; label: string } | null;

export function SiteNav({ account }: { account: Account }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const infoRef = useRef<HTMLDivElement>(null);

  // Tutup semua menu saat pindah halaman.
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setMenuOpen(false);
    setInfoOpen(false);
  }

  useEffect(() => {
    if (!infoOpen && !menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setInfoOpen(false);
        setMenuOpen(false);
      }
    };
    const onClick = (e: MouseEvent) => {
      if (infoRef.current && !infoRef.current.contains(e.target as Node)) setInfoOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("click", onClick);
    };
  }, [infoOpen, menuOpen]);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : !href.includes("#") && pathname.startsWith(href));
  const infoActive = pathname === "/info" || more.some((m) => isActive(m.href));
  const linkClass = (active: boolean) =>
    `whitespace-nowrap rounded-lg px-2.5 py-2 font-medium transition hover:bg-red-50 hover:text-red-700 ${
      active ? "text-red-700 underline decoration-2 underline-offset-8" : "text-stone-700"
    }`;

  return (
    <>
      {/* Desktop */}
      <nav aria-label="Menu utama" className="hidden items-center gap-0.5 text-[15px] lg:flex">
        {main.map((item) => (
          <Link key={item.href} href={item.href} className={linkClass(isActive(item.href))} aria-current={isActive(item.href) ? "page" : undefined}>
            {item.label}
          </Link>
        ))}
        <div ref={infoRef} className="relative">
          <button
            type="button"
            onClick={() => setInfoOpen((o) => !o)}
            aria-expanded={infoOpen}
            aria-controls="menu-info"
            className={`${linkClass(infoActive)} flex items-center gap-1`}
          >
            Info
            <svg viewBox="0 0 20 20" fill="currentColor" className={`h-4 w-4 transition ${infoOpen ? "rotate-180" : ""}`} aria-hidden>
              <path d="M5.2 7.2a.75.75 0 0 1 1.06 0L10 10.94l3.74-3.74a.75.75 0 1 1 1.06 1.06l-4.27 4.27a.75.75 0 0 1-1.06 0L5.2 8.26a.75.75 0 0 1 0-1.06z" />
            </svg>
          </button>
          {infoOpen && (
            <div id="menu-info" onClick={closeOnLink(setInfoOpen)} className="absolute right-0 top-full mt-2 w-60 rounded-2xl border border-stone-200 bg-white p-2 shadow-xl">
              {more.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block rounded-lg px-3 py-2.5 hover:bg-red-50 hover:text-red-700 ${isActive(item.href) ? "font-semibold text-red-700" : "text-stone-700"}`}
                >
                  {item.label}
                </Link>
              ))}
              <Link href="/info" className="mt-1 block rounded-lg border-t border-stone-100 px-3 py-2.5 font-semibold text-red-700 hover:bg-red-50">
                Semua info →
              </Link>
            </div>
          )}
        </div>
        <span className="mx-2 h-6 w-px bg-stone-200" aria-hidden />
        {account ? (
          <>
            <Link href={account.href} className={linkClass(isActive(account.href))}>
              {account.label}
            </Link>
            <span className="px-2.5">
              <SignOutButton />
            </span>
          </>
        ) : (
          <>
            <Link href="/belajar" className={linkClass(pathname.startsWith("/masuk"))}>
              Masuk
            </Link>
            <Link href="/waiting-list" className="ml-1 rounded-xl bg-red-700 px-4 py-2 font-semibold text-white shadow-sm hover:bg-red-800">
              Daftar
            </Link>
          </>
        )}
      </nav>

      {/* HP dan tablet */}
      <div className="flex items-center gap-2 lg:hidden">
        {!account && (
          <Link href="/waiting-list" className="rounded-xl bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800">
            Daftar
          </Link>
        )}
        <button
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          aria-expanded={menuOpen}
          aria-controls="menu-hp"
          aria-label={menuOpen ? "Tutup menu" : "Buka menu"}
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-stone-200 text-stone-800 hover:bg-stone-50"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="h-6 w-6" aria-hidden>
            {menuOpen ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </div>

      {menuOpen && (
        <nav
          id="menu-hp"
          aria-label="Menu"
          onClick={closeOnLink(setMenuOpen)}
          className="absolute inset-x-0 top-full max-h-[calc(100dvh-4.5rem)] overflow-y-auto border-b border-stone-200 bg-white shadow-xl lg:hidden"
        >
          <div className="mx-auto max-w-6xl px-4 pb-6 pt-2">
            <div className="grid gap-1">
              {main.map((item) => (
                <MobileLink key={item.href} href={item.href} label={item.label} active={isActive(item.href)} />
              ))}
            </div>
            <p className="mt-4 px-3 text-xs font-semibold uppercase tracking-wider text-stone-400">Info lainnya</p>
            <div className="mt-1 grid gap-1">
              {more.map((item) => (
                <MobileLink key={item.href} href={item.href} label={item.label} active={isActive(item.href)} />
              ))}
              <MobileLink href="/info" label="Semua info" active={pathname === "/info"} />
            </div>
            <div className="mt-5 grid gap-2">
              {account ? (
                <>
                  <Link href={account.href} className="rounded-xl bg-red-700 px-4 py-3 text-center font-semibold text-white hover:bg-red-800">
                    {account.label}
                  </Link>
                  <div className="py-2 text-center">
                    <SignOutButton />
                  </div>
                </>
              ) : (
                <>
                  <Link href="/waiting-list" className="rounded-xl bg-red-700 px-4 py-3 text-center font-semibold text-white hover:bg-red-800">
                    Daftar sekarang
                  </Link>
                  <Link href={trialHref} className="rounded-xl border-2 border-red-700 px-4 py-3 text-center font-semibold text-red-700 hover:bg-red-50">
                    Coba kelas gratis
                  </Link>
                  <Link href="/belajar" className="rounded-xl px-4 py-3 text-center font-medium text-stone-700 hover:bg-stone-50">
                    Masuk
                  </Link>
                </>
              )}
            </div>
          </div>
        </nav>
      )}
    </>
  );
}

function MobileLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex min-h-12 items-center justify-between rounded-xl px-3 text-base font-medium ${active ? "bg-red-50 text-red-700" : "text-stone-800 hover:bg-stone-50"}`}
    >
      {label}
      <span aria-hidden className="text-stone-400">›</span>
    </Link>
  );
}

// Klik link di dalam menu selalu menutup menu, juga untuk link /#program yang tidak mengganti halaman.
function closeOnLink(setOpen: (open: boolean) => void) {
  return (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("a")) setOpen(false);
  };
}
