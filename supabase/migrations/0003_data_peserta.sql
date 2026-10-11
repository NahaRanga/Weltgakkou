-- Data peserta mengikuti Google Form pendaftaran Weltgakkou.
create type gender as enum ('laki-laki', 'perempuan');

alter table profiles
  add column nickname text,
  add column gender gender,
  add column birth_place_date text,
  add column domicile text,
  add column address text,
  add column education text,
  add column occupation text,
  add column tiktok text,
  add column instagram text,
  add column studied_before boolean,
  add column prior_level text,
  add column learning_goal text;

-- Kapan peserta menyetujui pernyataan (data benar, ikut peraturan kelas).
alter table enrollments add column agreed_at timestamptz;
