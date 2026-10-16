-- Paket rekaman video (belajar mandiri) dan rekaman pengganti kelas live.

-- Paket rekaman dijual sebagai batch khusus tanpa jadwal, supaya alur
-- pendaftaran, tagihan, dan verifikasi bayar tetap sama dengan kelas live.
alter table batches add column if not exists mode text not null default 'live'
  check (mode in ('live', 'rekaman'));

-- Harga paket rekaman (sekali bayar) dan lama aksesnya. Awalnya setengah
-- harga sekali bayar kelas live, dibulatkan ke ribuan.
alter table programs add column if not exists recording_price integer;
alter table programs add column if not exists recording_months integer not null default 6;
update programs set recording_price = round(upfront_price / 2000.0) * 1000
  where recording_price is null and upfront_price is not null;

-- Batas akses siswa paket rekaman, diisi saat pembayaran diterima.
alter table enrollments add column if not exists access_until timestamptz;

-- Link rekaman tiap sesi kelas live, diisi sensei setelah kelas.
alter table sessions add column if not exists recording_url text;

-- Kehadiran lewat kelas live atau lewat menonton rekaman pengganti.
alter table attendance add column if not exists via text not null default 'live'
  check (via in ('live', 'rekaman'));

-- Pustaka video per program, dikelompokkan per bab.
create table if not exists recordings (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references programs (id) on delete cascade,
  chapter integer not null default 1,
  title text not null,
  url text not null,
  position integer not null default 0,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now()
);
create index if not exists recordings_program on recordings (program_id, chapter, position);
alter table recordings enable row level security;

-- Video yang sudah dibuka siswa, untuk progres tontonan.
create table if not exists recording_views (
  recording_id uuid not null references recordings (id) on delete cascade,
  profile_id uuid not null references profiles (id),
  viewed_at timestamptz not null default now(),
  primary key (recording_id, profile_id)
);
alter table recording_views enable row level security;
