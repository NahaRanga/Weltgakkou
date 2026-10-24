-- Link grup WhatsApp per batch (diisi admin atau sensei batch). Siswa yang sudah aktif melihat tombol "Gabung grup WhatsApp" di /belajar.
alter table public.batches add column if not exists whatsapp_group_url text;
