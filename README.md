# Weltgakkou

Website kursus bahasa Jepang (dan nanti Jerman) online Weltgakkou. Rancangan lengkap ada di dokumen
[Rancang Bangun Website Weltgakkou](https://claude.ai/code/artifact/665c3612-172f-4841-aca6-0c20a5ba4467).

Stack: Next.js 16 (App Router), Tailwind CSS 4, Supabase (Postgres, Auth, Storage), Resend untuk email.

## Status: Fase 1 (etalase)

- `/` beranda dengan daftar program dan harga
- `/program/[slug]` halaman per program dengan form waiting list
- `/waiting-list` form waiting list mandiri
- `/faq`
- Lead tersimpan di tabel `leads` Supabase; admin dikabari lewat email bila Resend diisi.
  Untuk Fase 1, daftar lead dilihat langsung di Table Editor Supabase.

Harga program ada di `src/lib/programs.ts` dan di seed `supabase/migrations/0001_init.sql`; ubah keduanya bila harga berubah.

## Menjalankan di lokal

```bash
npm install
cp .env.example .env.local   # isi nilai Supabase dan nomor WhatsApp
npm run dev
```

## Menyiapkan Supabase

1. Buat project baru di supabase.com (region Singapore).
2. Buka SQL Editor, jalankan isi `supabase/migrations/0001_init.sql`.
3. Salin Project URL dan service role key ke `.env.local` (dan ke env hosting).

Skema sudah mencakup seluruh pipeline (batch, sesi, tagihan, bukti bayar, absensi, ujian, sertifikasi, referral).
RLS aktif di semua tabel; policy untuk siswa dan pengajar ditambah di Fase 2.

## Berikutnya (Fase 2)

Pendaftaran batch dan tagihan dengan kode unik, upload bukti bayar, verifikasi admin satu klik yang membuat akun dan
enrollment otomatis, lalu area siswa berisi jadwal, link Google Meet, materi, dan nilai ujian Jumat.
