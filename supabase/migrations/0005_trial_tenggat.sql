-- Kelas trial gratis (P7) dan tenggat pendaftaran batch (P12).
-- Jalankan sekali di SQL Editor Supabase live. Aman diulang.

-- Kelas trial = batch biasa tanpa tagihan: satu sesi, link Zoom, kuota.
-- Pendaftarnya langsung aktif dan tidak muncul sebagai pilihan berbayar.
alter table batches add column if not exists is_trial boolean not null default false;

-- Batas akhir pendaftaran. Kosong = otomatis H-1 dari tanggal mulai jam 23.59 WIB
-- (kelas trial: sampai kelas dimulai). Setelah lewat, form daftar menolak dan
-- banner "Batch dibuka" hilang tanpa admin perlu mengubah status batch.
alter table batches add column if not exists registration_deadline timestamptz;
