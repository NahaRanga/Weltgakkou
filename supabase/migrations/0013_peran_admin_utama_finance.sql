-- Peran baru:
--   admin_utama = semua hak admin + hapus siswa + atur admin utama lain.
--   finance     = hanya Pembayaran, Siswa, Laporan; boleh hapus siswa.
-- Jalankan sekali di Supabase > SQL Editor. Nilai enum baru belum bisa dipakai
-- di transaksi yang sama, jadi penetapan admin utama dijalankan terpisah (lihat bawah).
alter type user_role add value if not exists 'admin_utama';
alter type user_role add value if not exists 'finance';

-- Setelah baris di atas sukses, jalankan ini terpisah (ganti email bila perlu):
-- update profiles set role = 'admin_utama' where lower(email) = 'weltgakko@gmail.com';
