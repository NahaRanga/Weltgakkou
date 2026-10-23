-- Sertifikat penyelesaian kelas (PDF dibuat saat diunduh, tidak disimpan).
-- Nomor diisi saat admin menandai siswa "selesai" atau menandai batch "selesai".
-- Jalankan sekali di SQL Editor Supabase. Aman dijalankan sebelum/sesudah 0006.
alter table enrollments add column if not exists certificate_no text unique;
alter table enrollments add column if not exists certificate_issued_at timestamptz;
