-- Skema awal Weltgakkou: seluruh pipeline (lead sampai sertifikasi).
-- Fase 1 hanya memakai `leads` dan `programs`; tabel lain disiapkan
-- agar Fase 2 tidak perlu membongkar database.
-- RLS aktif di semua tabel. Tanpa policy, hanya service role (server) yang
-- bisa membaca dan menulis; policy untuk siswa dan pengajar ditambah di Fase 2.

create type user_role as enum ('siswa', 'pengajar', 'admin', 'konten');
create type lead_status as enum ('baru', 'dihubungi', 'daftar', 'batal');
create type batch_status as enum ('buka', 'berjalan', 'selesai');
create type session_kind as enum ('kelas', 'ujian');
create type enrollment_status as enum ('menunggu_bayar', 'aktif', 'selesai', 'keluar');
create type invoice_status as enum ('belum', 'menunggu_verifikasi', 'lunas', 'ditolak', 'kedaluwarsa');
create type payment_method as enum ('transfer', 'qris');

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  whatsapp text,
  role user_role not null default 'siswa',
  referral_code text unique,
  created_at timestamptz not null default now()
);

create table programs (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  language text not null check (language in ('jp', 'de')),
  level text not null,
  duration_label text not null,
  monthly_price integer,
  upfront_price integer,
  meeting_count integer,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table leads (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  whatsapp text not null,
  email text,
  program_slug text references programs (slug),
  source text,
  referral_code text,
  note text,
  status lead_status not null default 'baru',
  created_at timestamptz not null default now()
);
create index leads_status_idx on leads (status, created_at desc);

create table batches (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references programs (id),
  name text not null,
  start_date date not null,
  schedule_label text not null,
  quota integer not null default 10,
  teacher_id uuid references profiles (id),
  status batch_status not null default 'buka',
  created_at timestamptz not null default now()
);

create table sessions (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references batches (id) on delete cascade,
  number integer not null,
  starts_at timestamptz not null,
  meeting_url text,
  topic text,
  kind session_kind not null default 'kelas',
  unique (batch_id, number)
);

create table enrollments (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles (id),
  batch_id uuid not null references batches (id),
  status enrollment_status not null default 'menunggu_bayar',
  created_at timestamptz not null default now(),
  unique (profile_id, batch_id)
);

create table invoices (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references enrollments (id) on delete cascade,
  code text not null unique,
  amount integer not null,
  unique_code integer not null check (unique_code between 1 and 999),
  method payment_method,
  status invoice_status not null default 'belum',
  due_at timestamptz not null,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create table payment_proofs (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices (id) on delete cascade,
  file_path text not null,
  uploaded_at timestamptz not null default now(),
  verified_by uuid references profiles (id),
  verified_at timestamptz,
  note text
);

create table materials (
  id uuid primary key default gen_random_uuid(),
  program_id uuid references programs (id),
  session_id uuid references sessions (id) on delete cascade,
  title text not null,
  kind text not null check (kind in ('pdf', 'video', 'link')),
  url text not null,
  created_at timestamptz not null default now(),
  check (program_id is not null or session_id is not null)
);

create table attendance (
  session_id uuid not null references sessions (id) on delete cascade,
  profile_id uuid not null references profiles (id),
  present boolean not null default true,
  recorded_at timestamptz not null default now(),
  primary key (session_id, profile_id)
);

create table exams (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions (id) on delete cascade,
  title text not null,
  max_score integer not null default 100,
  form_url text
);

create table exam_results (
  exam_id uuid not null references exams (id) on delete cascade,
  profile_id uuid not null references profiles (id),
  score numeric not null,
  note text,
  primary key (exam_id, profile_id)
);

create table certifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles (id),
  kind text not null check (kind in ('N5', 'N4', 'N3', 'JFT', 'A1', 'A2', 'B1', 'B2')),
  passed boolean not null,
  exam_date date,
  proof_path text,
  bonus_paid boolean not null default false
);

create table referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references profiles (id),
  enrollment_id uuid not null references enrollments (id),
  percent numeric not null check (percent between 5 and 10),
  amount integer not null,
  paid boolean not null default false
);

alter table profiles enable row level security;
alter table programs enable row level security;
alter table leads enable row level security;
alter table batches enable row level security;
alter table sessions enable row level security;
alter table enrollments enable row level security;
alter table invoices enable row level security;
alter table payment_proofs enable row level security;
alter table materials enable row level security;
alter table attendance enable row level security;
alter table exams enable row level security;
alter table exam_results enable row level security;
alter table certifications enable row level security;
alter table referrals enable row level security;

-- Daftar program boleh dibaca publik.
create policy "programs dibaca publik" on programs for select using (true);

insert into programs (slug, name, language, level, duration_label, monthly_price, upfront_price, meeting_count, active) values
  ('kiso', 'Kiso: Hiragana dan Katakana', 'jp', 'Pra-N5', '1 bulan, 2x seminggu', 200000, 200000, 8, true),
  ('jlpt-n5', 'JLPT N5', 'jp', 'N5', '3 bulan', 600000, 1500000, null, true),
  ('jlpt-n4', 'JLPT N4', 'jp', 'N4', '3 bulan', 650000, 1800000, null, true),
  ('jlpt-n3', 'JLPT N3', 'jp', 'N3', '6 bulan', 800000, 4500000, null, true),
  ('jft-basic', 'JFT-Basic', 'jp', 'N5 + N4', '6 bulan', null, 3000000, null, true),
  ('jerman-a1', 'Bahasa Jerman A1', 'de', 'A1', '2 bulan', 700000, 1300000, 32, false),
  ('jerman-a2', 'Bahasa Jerman A2', 'de', 'A2', '2 bulan', 750000, 1400000, 32, false),
  ('jerman-b1', 'Bahasa Jerman B1', 'de', 'B1', '3 bulan', 900000, 2500000, 48, false),
  ('jerman-b2', 'Bahasa Jerman B2', 'de', 'B2', '4 bulan', 1000000, 3600000, 64, false);
