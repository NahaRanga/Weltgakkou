-- Form /trial: username Instagram + TikTok (opsional) dan "Tau Weltgakko dari mana?".
-- Disimpan per pendaftaran (enrollment), diisi hanya lewat form trial.
-- Jalankan sekali di Supabase > SQL Editor. Aman diulang (if not exists).
-- Sebelum dijalankan, form trial tetap jalan; ketiga isian ini saja yang belum tersimpan.

alter table enrollments add column if not exists instagram text;
alter table enrollments add column if not exists tiktok text;
alter table enrollments add column if not exists heard_from text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'enrollments_heard_from_check') then
    alter table enrollments
      add constraint enrollments_heard_from_check
      check (heard_from is null or heard_from in ('tiktok', 'instagram', 'website', 'teman'));
  end if;
end $$;

-- Supaya API Supabase langsung kenal kolom baru.
notify pgrst, 'reload schema';
