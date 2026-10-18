import { Suspense } from "react";
import { BatchOpenStrip } from "@/components/batch-open-banner";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

// Halaman publik dan area siswa memakai header dan footer situs; /admin punya tampilan sendiri.
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Suspense fallback={null}>
        <BatchOpenStrip />
      </Suspense>
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </>
  );
}
