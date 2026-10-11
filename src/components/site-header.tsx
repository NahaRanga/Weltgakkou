import Link from "next/link";

const nav = [
  { href: "/#program", label: "Program" },
  { href: "/faq", label: "FAQ" },
  { href: "/belajar", label: "Masuk" },
];

export function SiteHeader() {
  return (
    <header className="border-b border-stone-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-baseline gap-2 font-bold text-stone-900">
          <span className="text-xl">Weltgakkou</span>
          <span className="font-jp hidden text-sm font-normal text-red-700 sm:inline">世界学校</span>
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} className="text-stone-600 hover:text-stone-900">
              {item.label}
            </Link>
          ))}
          <Link href="/waiting-list" className="rounded-lg bg-red-700 px-3 py-2 font-semibold text-white hover:bg-red-800">
            Daftar
          </Link>
        </nav>
      </div>
    </header>
  );
}
