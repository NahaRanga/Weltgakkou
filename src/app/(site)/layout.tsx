import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

// Halaman publik dan area siswa memakai header dan footer situs; /admin punya tampilan sendiri.
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </>
  );
}
