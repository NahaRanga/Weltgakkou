import type { Metadata } from "next";
import { InfoPage, Section } from "@/components/info-page";
import { SocialIcon, SocialLinks } from "@/components/social-links";
import { activeSocial, site, waLink } from "@/lib/site";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Kontak",
  description: "Hubungi Weltgakko lewat WhatsApp atau sosial media.",
  path: "/kontak",
  image: { src: "/images/tentang-kontak.jpg", alt: "Ilustrasi tim Weltgakko siap membantu lewat chat" },
});

export default function ContactPage() {
  return (
    <InfoPage path="/kontak" kicker="お問い合わせ" title="Kontak" intro="Ada pertanyaan soal kelas, jadwal, atau pembayaran? Tanya saja, kami bantu."
      image={{ src: "/images/tentang-kontak.jpg", alt: "Ilustrasi tim Weltgakko siap membantu lewat chat dan email" }}
    >
      <Section title="Hubungi kami">
        <div className="grid gap-4 sm:grid-cols-2">
          <a href={waLink("Halo Weltgakko, saya mau tanya kelas.")} className="flex items-center gap-4 rounded-2xl border border-stone-200 bg-white p-5 hover:border-emerald-600">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
              <SocialIcon name="whatsapp" className="h-6 w-6" />
            </span>
            <span>
              <span className="block font-semibold text-stone-900">WhatsApp</span>
              <span className="text-sm text-stone-600">{site.whatsapp ? "Chat admin Weltgakko" : "Tinggalkan nomormu di waiting list, kami yang menghubungi"}</span>
            </span>
          </a>
          {site.email && (
            <a href={`mailto:${site.email}`} className="flex items-center gap-4 rounded-2xl border border-stone-200 bg-white p-5 hover:border-red-700">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-lg text-red-700">@</span>
              <span>
                <span className="block font-semibold text-stone-900">Email</span>
                <span className="text-sm text-stone-600">{site.email}</span>
              </span>
            </a>
          )}
        </div>
      </Section>

      {activeSocial().length > 0 && (
        <Section title="Ikuti kami" subtitle="Tips belajar, info batch baru, dan promo ada di sosial media kami.">
          <SocialLinks withLabel />
        </Section>
      )}
    </InfoPage>
  );
}
