-- Akun test tampilan siswa (2026-10-24).
-- Pendaftaran yang ditandai is_test tidak dihitung di kuota/sisa kursi publik,
-- angka dashboard admin, maupun laporan. Dipakai untuk akun internal yang ingin
-- melihat tampilan /belajar seperti siswa sungguhan.
alter table enrollments add column if not exists is_test boolean not null default false;
