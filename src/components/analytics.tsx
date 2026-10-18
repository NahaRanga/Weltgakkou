"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

// ID diisi di .env.production. Kosong = script tidak dimuat sama sekali.
const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "";
const TIKTOK_PIXEL_ID = process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID ?? "";
// Hanya perlu bila Web Analytics Cloudflare tidak disuntik otomatis dari dashboard.
const CF_BEACON_TOKEN = process.env.NEXT_PUBLIC_CF_BEACON_TOKEN ?? "";

// Halaman pribadi (admin, area siswa, tagihan, login) tidak dikirim ke pixel iklan.
const PRIVATE = /^\/(admin|belajar|bayar|masuk|atur-password|auth)(\/|$)/;

type Fbq = (...args: unknown[]) => void;
type Ttq = { page: () => void; track: (event: string, params?: Record<string, unknown>) => void };
declare global {
  interface Window {
    fbq?: Fbq;
    ttq?: Ttq;
  }
}

// Nama event Meta → event standar TikTok yang setara.
const tiktokEvent = { Lead: "SubmitForm", InitiateCheckout: "InitiateCheckout", Contact: "Contact" } as const;
export type ConversionEvent = keyof typeof tiktokEvent;

// Kirim event konversi ke pixel yang aktif. Aman dipanggil walau pixel belum diisi.
export function trackEvent(name: ConversionEvent, params?: Record<string, unknown>) {
  if (typeof window === "undefined" || PRIVATE.test(window.location.pathname)) return;
  window.fbq?.("track", name, params);
  window.ttq?.track(tiktokEvent[name], params);
}

export function Analytics() {
  const pathname = usePathname();
  const isPrivate = PRIVATE.test(pathname);

  // PageView dikirim manual tiap pindah halaman (navigasi Next tidak memuat ulang halaman).
  useEffect(() => {
    if (isPrivate) return;
    window.fbq?.("track", "PageView");
    window.ttq?.page();
  }, [pathname, isPrivate]);

  // Klik tombol/link WhatsApp dihitung sebagai "Contact", kanal utama calon siswa.
  useEffect(() => {
    if (!META_PIXEL_ID && !TIKTOK_PIXEL_ID) return;
    const onClick = (e: MouseEvent) => {
      const link = (e.target as Element | null)?.closest?.("a[href^='https://wa.me/']");
      if (link) trackEvent("Contact");
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return (
    <>
      {CF_BEACON_TOKEN && (
        <Script
          src="https://static.cloudflareinsights.com/beacon.min.js"
          data-cf-beacon={JSON.stringify({ token: CF_BEACON_TOKEN, spa: true })}
          strategy="afterInteractive"
        />
      )}
      {/* Pixel dimuat sekali begitu pengunjung membuka halaman publik. Script inline ini jalan lebih dulu dari
          efek PageView di atas (efek komponen anak dijalankan dulu), dan stub fbq/ttq mengantrikan event
          sampai library selesai diunduh. */}
      {!isPrivate && META_PIXEL_ID && (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq.disablePushState=true;fbq('init',${JSON.stringify(META_PIXEL_ID)});`}
        </Script>
      )}
      {!isPrivate && TIKTOK_PIXEL_ID && (
        <Script id="tiktok-pixel" strategy="afterInteractive">
          {`!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js",o=n&&n.partner;ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=r,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};n=document.createElement("script");n.type="text/javascript",n.async=!0,n.src=r+"?sdkid="+e+"&lib="+t;e=document.getElementsByTagName("script")[0];e.parentNode.insertBefore(n,e)};
ttq.load(${JSON.stringify(TIKTOK_PIXEL_ID)});}(window,document,"ttq");`}
        </Script>
      )}
    </>
  );
}
