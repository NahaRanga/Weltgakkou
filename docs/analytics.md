# Preview link (OG) dan analytics

## Preview link
- Gambar default: `public/og/weltgakko.jpg` (1200×630). Dipakai beranda dan halaman yang tidak punya gambar sendiri.
- Halaman program dan halaman info memakai ilustrasinya sendiri lewat `pageMetadata()` di `src/lib/seo.ts`.
- Halaman publik baru: pakai `export const metadata = pageMetadata({ title, description, path, image })` supaya judul dan gambar preview ikut benar.
- Cek setelah deploy: tempel link di https://developers.facebook.com/tools/debug/ lalu klik "Scrape Again" (WhatsApp ikut cache Facebook; link yang sudah pernah dibagikan bisa butuh waktu untuk berubah).

## Cloudflare Web Analytics (gratis, tanpa cookie)
1. Dashboard Cloudflare → Analytics & Logs → Web Analytics → Add a site → pilih `weltgakko.com`.
2. Bila Cloudflare menawarkan "Automatic setup" (situs lewat proxy Cloudflare), pilih itu dan selesai.
3. Bila hanya diberi snippet JS: salin nilai `token` dari snippet, isi `NEXT_PUBLIC_CF_BEACON_TOKEN=` di `.env.production`, commit ke `main`.

## Meta Pixel (Instagram/Facebook Ads)
1. https://business.facebook.com/events_manager → Connect data sources → Web → Meta Pixel → nama "Weltgakko".
2. Pilih pasang manual (bukan partner), salin **Pixel ID** (angka 15–16 digit).
3. Isi `NEXT_PUBLIC_META_PIXEL_ID=<angka>` di `.env.production`, commit ke `main`.
4. Cek pakai ekstensi Chrome "Meta Pixel Helper": beranda harus muncul PageView.

## TikTok Pixel
1. TikTok Ads Manager → Tools → Events → Web Events → Set up web events → Manual setup → TikTok Pixel.
2. Salin **Pixel ID** (huruf besar + angka, mis. `C1ABCD...`).
3. Isi `NEXT_PUBLIC_TIKTOK_PIXEL_ID=<id>` di `.env.production`, commit ke `main`.
4. Cek pakai ekstensi "TikTok Pixel Helper".

## Event yang dikirim
| Kejadian | Meta | TikTok |
|---|---|---|
| Buka halaman publik | PageView | page |
| Waiting list terkirim | Lead | SubmitForm |
| Kirim form daftar batch (sekali per form) | InitiateCheckout | InitiateCheckout |
| Klik link WhatsApp (wa.me) | Contact | Contact |

- Pixel tidak dimuat di `/admin`, `/belajar`, `/bayar`, `/masuk`, `/atur-password`, `/auth`.
- Purchase tidak dikirim: pembayaran manual diverifikasi admin.
- Form baru (mis. daftar trial) cukup panggil `trackEvent("Lead")` dari `@/components/analytics` setelah sukses.
- Link iklan: tambahkan UTM, mis. `https://weltgakko.com/?utm_source=instagram&utm_medium=paid&utm_campaign=batch1`. UTM ikut terbaca di laporan pixel.
