-- Fase 2: pendaftaran batch, tagihan, bukti bayar, dan area siswa.
-- Semua akses data lewat server (service role) setelah sesi pengguna dicek,
-- jadi RLS tetap aktif tanpa policy untuk tabel privat.

create type payment_plan as enum ('bulanan', 'lunas');

-- Satu link Google Meet tetap per batch; sesi boleh menimpanya bila perlu.
alter table batches add column meeting_url text;

alter table enrollments add column plan payment_plan not null default 'lunas';
alter table enrollments add column referral_code text;

alter table invoices add column installment_no integer not null default 1;
alter table invoices add column reject_reason text;

-- Kode unik 3 digit tidak boleh dipakai dua tagihan aktif sekaligus,
-- supaya nominal transfer selalu bisa dicocokkan ke satu tagihan.
create unique index invoices_active_unique_code
  on invoices (unique_code)
  where status in ('belum', 'menunggu_verifikasi');

-- Bucket privat untuk foto bukti transfer.
insert into storage.buckets (id, name, public)
values ('payment-proofs', 'payment-proofs', false)
on conflict (id) do nothing;

-- Email disimpan di profil supaya pendaftar lama bisa dikenali lagi.
alter table profiles add column email text unique;

-- Lama program dalam bulan, untuk jumlah cicilan bulanan.
alter table programs add column months integer;
update programs set months = case slug
  when 'kiso' then 1 when 'jlpt-n5' then 3 when 'jlpt-n4' then 3 when 'jlpt-n3' then 6
  when 'jft-basic' then 6 when 'jerman-a1' then 2 when 'jerman-a2' then 2
  when 'jerman-b1' then 3 when 'jerman-b2' then 4 end;
