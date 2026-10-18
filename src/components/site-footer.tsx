import Image from "next/image";
import Link from "next/link";
import { activeSocial, site, waLink } from "@/lib/site";
import { infoPages } from "@/lib/info-pages";
import { SocialIcon, socialColor } from "@/components/social-links";
import { withBase } from "@/lib/base-path";

export function SiteFooter() {
  // WhatsApp ikut berjajar dengan sosmed supaya semua kontak ada di satu tempat.
  const links = [
    ...(site.whatsapp ? [{ key: "whatsapp" as const, label: "WhatsApp", url: waLink("Halo Weltgakko, saya mau tanya kelas.") }] : []),
    ...activeSocial(),
  ];
  const year = new Date().getFullYear();
  return (
    <footer className="mt-16 border-t border-stone-200 bg-white">
      <div className="mx-auto grid max-w-5xl grid-cols-2 gap-x-6 gap-y-8 px-4 py-10 text-sm text-stone-600 lg:grid-cols-[1.2fr_0.9fr_0.9fr_1.3fr]">
        <div className="col-span-2 lg:col-span-1">
          <Image src={withBase("/logo-full.png")} alt="Weltgakko Academie" width={120} height={106} className="h-auto w-28" />
          <p className="mt-2">Kursus bahasa Jepang dan Jerman online untuk kerja, studi, dan JLPT.</p>
          {site.email && (
            <a href={`mailto:${site.email}`} className="mt-2 inline-block hover:text-red-700">
              {site.email}
            </a>
          )}
        </div>
        <FooterColumn title="Kursus">
          <FooterLink href="/#program">Program</FooterLink>
          <FooterLink href="/waiting-list">Daftar / waiting list</FooterLink>
          <FooterLink href="/faq">FAQ</FooterLink>
          <FooterLink href="/refund">Kebijakan refund</FooterLink>
        </FooterColumn>
        <FooterColumn title="Info">
          {infoPages.map((p) => (
            <FooterLink key={p.href} href={p.href}>{p.menu}</FooterLink>
          ))}
        </FooterColumn>
        <div className="col-span-2 lg:col-span-1">
          <p className="font-semibold text-stone-900">Ikuti dan hubungi kami</p>
          <div className="mt-3 flex flex-wrap gap-3">
            {links.map((s) => (
              <a
                key={s.key}
                href={s.url}
                target="_blank"
                rel="noreferrer"
                aria-label={s.label}
                title={s.label}
                className={`flex h-12 w-12 items-center justify-center rounded-full text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${socialColor[s.key]}`}
              >
                <SocialIcon name={s.key} className="h-6 w-6" />
              </a>
            ))}
          </div>
          <p className="mt-3 text-xs text-stone-500">{links.map((s) => s.label).join(" · ")}</p>
        </div>
      </div>
      <div className="border-t border-stone-200">
        <div className="mx-auto flex max-w-5xl flex-col gap-2 px-4 py-5 text-xs text-stone-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} {site.name}. Hak cipta dilindungi.</p>
          <div className="flex gap-4">
            <Link href="/refund" className="hover:text-stone-800">Kebijakan refund</Link>
            <Link href="/kontak" className="hover:text-stone-800">Kontak</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="font-semibold text-stone-900">{title}</p>
      <div className="mt-3 space-y-2">{children}</div>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="block hover:text-red-700">
      {children}
    </Link>
  );
}
