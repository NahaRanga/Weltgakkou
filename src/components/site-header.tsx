import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { SiteNav } from "@/components/site-nav";
import { getCurrentUser } from "@/lib/auth";
import { withBase } from "@/lib/base-path";

export async function SiteHeader() {
  // Supabase hanya dipanggil bila ada cookie sesi, supaya pengunjung biasa tidak menambah beban.
  const hasSession = (await cookies()).getAll().some((c) => c.name.startsWith("sb-") && c.name.includes("auth-token"));
  const user = hasSession ? await getCurrentUser() : null;
  const account = !user
    ? null
    : user.role === "admin"
      ? { href: "/admin", label: "Admin" }
      : user.role === "pengajar"
        ? { href: "/admin", label: "Dashboard" }
        : { href: "/belajar", label: "Area belajar" };
  return (
    <header className="sticky top-0 z-40 border-b border-stone-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="flex shrink-0 items-center gap-2 font-bold text-stone-900">
          <Image src={withBase("/logo-mark.png")} alt="" width={48} height={32} priority className="h-8 w-auto" />
          <span className="text-xl">Weltgakko</span>
          <span className="font-jp hidden text-sm font-normal text-red-700 sm:inline lg:hidden xl:inline">世界学校</span>
        </Link>
        <SiteNav account={account} />
      </div>
    </header>
  );
}
