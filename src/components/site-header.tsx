import Image from "next/image";
import Link from "next/link";
import { withBase } from "@/lib/base-path";

const nav = [
  { href: "/#program", label: "Program", mobile: false },
  { href: "/faq", label: "FAQ", mobile: false },
  { href: "/belajar", label: "Masuk", mobile: true },
];

export function SiteHeader() {
  return (
    <header className="border-b border-stone-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-bold text-stone-900">
          <Image src={withBase("/logo-mark.png")} alt="" width={48} height={32} priority className="h-8 w-auto" />
          <span className="text-xl">Weltgakkou</span>
          <span className="font-jp hidden text-sm font-normal text-red-700 sm:inline">世界学校</span>
        </Link>
        <nav className="flex shrink-0 items-center gap-4 text-sm">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`text-stone-600 hover:text-stone-900 ${item.mobile ? "" : "hidden sm:inline"}`}
            >
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
