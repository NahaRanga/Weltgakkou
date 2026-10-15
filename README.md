# Weltgakkou

Website kursus bahasa Jepang (dan nanti Jerman) online Weltgakkou. Rancangan lengkap ada di dokumen
[Rancang Bangun Website Weltgakkou](https://claude.ai/code/artifact/665c3612-172f-4841-aca6-0c20a5ba4467).

Stack: Next.js 16 (App Router), Tailwind CSS 4, Supabase (Postgres, Auth, Storage), Resend untuk email.

## Isi website

**Fase 1, etalase:** beranda, halaman program dengan harga, waiting list, FAQ.

**Fase 2, pipeline siswa:**

1. Admin membuat batch di `/admin` (jadwal sesi Senin-Kamis dan ujian Jumat dibuat otomatis, jam WIB).
2. Halaman program menampilkan batch yang dibuka; calon siswa daftar di `/daftar/[batch]`.
3. Sistem membuat tagihan dengan kode unik 3 digit (berlaku 24 jam) di `/bayar/[kode]`,
   menampilkan rekening dan QRIS, lalu siswa mengunggah bukti.
4. Admin mencocokkan mutasi dan klik **Terima** di `/admin`: tagihan lunas, kelas aktif, fee referral tercatat,
   dan siswa menerima link untuk membuat password (lewat email Resend, atau pesan WhatsApp siap kirim bila Resend belum diisi).
5. Siswa masuk ke `/belajar`: kelas berikutnya dengan tombol **Masuk kelas** (aktif 15 menit sebelum mulai,
   mencatat kehadiran lalu membuka Google Meet), jadwal lengkap, materi, nilai, kehadiran, dan tagihan cicilan.
6. Siswa cicilan bulanan: admin klik "Buat tagihan bulan berikutnya".

Belum ada: halaman pengajar untuk input materi dan nilai (sementara lewat Table Editor Supabase),
sertifikat PDF otomatis, dan pembayaran otomatis (Midtrans/Xendit, Fase 3).

Harga program ada di `src/lib/programs.ts` dan di seed `supabase/migrations/0001_init.sql`; ubah keduanya bila harga berubah.

## Menjalankan di lokal

```bash
npm install
npx supabase start          # butuh Docker; menjalankan Supabase lokal dan semua migrasi
cp .env.example .env.local  # isi dengan URL dan key dari output perintah di atas
npm run dev
```

## Menyiapkan Supabase production

1. Buat project baru di supabase.com (region Singapore).
2. Jalankan semua file di `supabase/migrations/` berurutan lewat SQL Editor (atau `npx supabase db push`).
3. Isi env di hosting sesuai `.env.example`.
4. Buat akun admin pertama: Authentication > Add user (email + password), lalu di SQL Editor:

```sql
insert into profiles (id, email, full_name, role)
select id, email, 'Winata', 'admin' from auth.users where email = 'email-admin@contoh.com';
```

Semua data dibaca dan ditulis lewat server setelah sesi login dicek. RLS aktif di semua tabel tanpa policy publik
(kecuali daftar program), jadi kunci publishable tidak bisa dipakai untuk membaca data siswa.

## Deploy ke Cloudflare Workers

Website berjalan di Cloudflare Workers lewat adapter [OpenNext](https://opennext.js.org/cloudflare) (paket gratis cukup).
Cache Components Next.js sengaja dimatikan karena belum didukung adapter ini.

Saat ini website dipasang di **panjimuhammad.com/weltgakko** (Worker `weltgakkou`). Alamat, base path, dan nomor
WhatsApp ada di `wrangler.jsonc` dan `.env.production`; ubah di sana bila pindah domain.

1. Cloudflare dashboard > Workers & Pages > Worker `weltgakkou` > Settings > Build > **Connect** repository
   `NahaRanga/Weltgakkou`, branch `main`.
2. Build command: `npx opennextjs-cloudflare build`. Deploy command: `npx opennextjs-cloudflare deploy`.
3. Settings > Variables and Secrets, tambah sebagai **Secret**: `SUPABASE_URL`, `SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY`, `BANK_NAME`, `BANK_ACCOUNT_NUMBER`, `BANK_ACCOUNT_HOLDER`
   (opsional `RESEND_API_KEY`, `ADMIN_EMAIL`, `EMAIL_FROM`). Variabel biasa di dashboard akan tertimpa `vars`
   dari `wrangler.jsonc` setiap deploy, jadi pakai Secret.
4. Setelah itu setiap push ke `main` otomatis di-build dan di-deploy.

Coba di lokal dengan runtime Cloudflare: salin `.env.local` ke `.dev.vars`, lalu `npm run preview`.
Catatan: flag `global_fetch_strictly_public` di `wrangler.jsonc` memblokir fetch ke 127.0.0.1, jadi untuk
uji dengan Supabase lokal hapus flag itu sementara.

`patches/` berisi perbaikan kecil untuk `@opennextjs/cloudflare` 1.20.10 (manifest `preview-props.json` dari Next 16.4
belum ikut di-bundle); dipasang otomatis oleh `postinstall`.
