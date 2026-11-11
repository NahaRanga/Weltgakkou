-- Program baru: Kaiwa + Persiapan JFT/JLPT (permintaan Nurdin, 11 Nov 2026).
-- 3x seminggu, 1,5 jam per pertemuan, 12 pertemuan per bulan.
-- Harga normal Rp2.000.000; promo November Rp1.600.000 (yang ditagih = upfront_price).
-- Aman dijalankan ulang. Tanpa perubahan skema.
insert into programs (slug, name, language, level, duration_label, monthly_price, upfront_price, meeting_count, months, active)
values ('kaiwa-jft-jlpt', 'Kaiwa + Persiapan JFT/JLPT', 'jp', 'Percakapan + JFT/JLPT', '1 bulan, 12 pertemuan', null, 1600000, 12, 1, true)
on conflict (slug) do update set
  name = excluded.name,
  level = excluded.level,
  duration_label = excluded.duration_label,
  monthly_price = excluded.monthly_price,
  upfront_price = excluded.upfront_price,
  meeting_count = excluded.meeting_count,
  months = excluded.months,
  active = true;

-- Setelah promo selesai (1 Desember 2026), jalankan baris ini supaya tagihan jadi harga normal:
-- update programs set upfront_price = 2000000 where slug = 'kaiwa-jft-jlpt';
