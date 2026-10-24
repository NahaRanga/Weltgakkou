-- Seminar gratis "Mengenal Jepang Lebih Dekat": jadwal + pendaftar.
-- Tidak bergantung pada 0006_latihan atau 0007_sertifikat, boleh dijalankan lebih dulu.
-- Pengingat dikirim admin lewat link wa.me (tanpa API WA berbayar);
-- kolom *_at mencatat kapan admin menandai pesan sudah dikirim.

create table seminars (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  starts_at timestamptz not null,
  duration_minutes int not null default 90,
  meeting_url text,
  quota int,
  is_open boolean not null default true,
  created_at timestamptz not null default now()
);
create index seminars_starts_idx on seminars (starts_at);

create table seminar_registrations (
  id uuid primary key default gen_random_uuid(),
  seminar_id uuid not null references seminars (id) on delete cascade,
  full_name text not null,
  whatsapp text not null,
  email text,
  city text,
  goal text,
  source text,
  question text,
  confirmed_at timestamptz,
  reminded_h1_at timestamptz,
  reminded_h0_at timestamptz,
  attended boolean not null default false,
  followed_up_at timestamptz,
  note text,
  created_at timestamptz not null default now(),
  unique (seminar_id, whatsapp)
);
create index seminar_registrations_seminar_idx on seminar_registrations (seminar_id, created_at desc);

-- Sama seperti tabel lain: RLS aktif tanpa policy, hanya server (service role) yang baca/tulis.
alter table seminars enable row level security;
alter table seminar_registrations enable row level security;

-- Dua jadwal launching, Sabtu 17.00 WIB (= 10.00 UTC). Link Zoom diisi admin di /admin/seminar.
insert into seminars (title, starts_at) values
  ('Mengenal Jepang Lebih Dekat', '2026-10-31 10:00:00+00'),
  ('Mengenal Jepang Lebih Dekat', '2026-11-14 10:00:00+00');
