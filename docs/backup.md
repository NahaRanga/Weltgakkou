# Backup data Supabase

Supabase Free tidak punya backup yang bisa diunduh, jadi workflow
`.github/workflows/backup.yml` membuat backup sendiri tiap **Minggu 01.00 WIB**
(dan bisa dijalankan manual).

Isi backup (satu file `weltgakko-backup-YYYYMMDD-HHMM.tar.gz.gpg`):

| File | Isi |
|---|---|
| `db/public.sql` | Semua tabel aplikasi (skema + data) |
| `db/auth-data.sql` | Akun login (`auth.users`, `auth.identities`), data saja |
| `db/row-counts.txt` | Jumlah baris beberapa tabel, untuk cek restore |
| `storage/payment-proofs/` | Semua foto bukti transfer |

File dienkripsi gpg (AES256) dengan `BACKUP_PASSPHRASE`, lalu disimpan sebagai
artifact GitHub Actions selama **30 hari**. Repo ini publik, jadi artifact bisa
diunduh siapa saja yang login GitHub: tanpa passphrase isinya tidak bisa dibuka.

## Secret yang dibutuhkan

GitHub repo → Settings → Secrets and variables → Actions → New repository secret:

| Nama | Isi |
|---|---|
| `SUPABASE_DB_URL` | Supabase → Connect → **Session pooler** → URI, ganti `[YOUR-PASSWORD]` dengan password database. Jangan pakai "Direct connection" (alamat IPv6, tidak bisa dari GitHub). |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API Keys → `service_role` (sama dengan yang di Cloudflare) |
| `BACKUP_PASSPHRASE` | Kalimat acak minimal 16 karakter. **Simpan juga di tempat aman** (password manager / catatan offline). Hilang = backup tidak bisa dibuka. |

## Menjalankan manual

GitHub repo → Actions → **Backup Supabase** → Run workflow. Setelah hijau, file
ada di bagian **Artifacts** di halaman run itu.

Disarankan sebulan sekali unduh artifact terbaru ke Google Drive perusahaan,
karena artifact otomatis terhapus setelah 30 hari.

Catatan GitHub: jadwal otomatis di repo publik dimatikan bila repo tidak ada
aktivitas 60 hari. Kalau itu terjadi, buka tab Actions dan aktifkan lagi.

## Membuka backup

Butuh `gpg` dan `tar` (di Windows sudah ada di **Git Bash**).

```bash
unzip weltgakko-backup-*.zip          # artifact GitHub selalu dibungkus zip
gpg -d weltgakko-backup-*.tar.gz.gpg | tar -xzf -   # minta passphrase
cat db/row-counts.txt
```

## Restore ke project Supabase baru

1. Buat project Supabase baru, ambil connection string Session pooler-nya (`$DB`).
2. Pulihkan akun login dulu (tabel `profiles` merujuk `auth.users`), lalu tabel aplikasi:

   ```bash
   psql "$DB" -f db/auth-data.sql
   psql "$DB" -f db/public.sql
   ```

   Pesan error "already exists" untuk skema `public` atau extension wajar dan boleh diabaikan.
3. Buat bucket privat `payment-proofs` (atau jalankan bagian bucket di
   `supabase/migrations/0002_fase2.sql`), lalu unggah isi `storage/payment-proofs/`
   dengan struktur folder yang sama (Supabase → Storage → Upload folder).
4. Cek: `psql "$DB" -c "select count(*) from profiles"` sama dengan angka di `row-counts.txt`.
5. Ganti kunci Supabase di secret Cloudflare dan di GitHub ke project baru.

Untuk sekadar mengecek isi tanpa project baru, bisa restore ke Postgres lokal
(Docker `supabase/postgres`) karena dump memakai skema `auth` dan `storage` khas Supabase.
