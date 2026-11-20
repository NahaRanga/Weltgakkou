-- Seminar + kelas trial jadi satu rangkaian: sekali daftar seminar langsung terdaftar trial besoknya.
-- Lanjutan 0008_seminar. Tidak bergantung pada 0009–0011.

alter table seminars
  add column trial_starts_at timestamptz,
  add column trial_duration_minutes int not null default 60,
  add column trial_meeting_url text;

alter table seminar_registrations
  add column trial_reminded_at timestamptz,
  add column trial_attended boolean not null default false;

-- Jadwal launching: trial Minggu 10.00 WIB, sehari setelah seminar Sabtu 17.00 WIB (selisih 17 jam).
-- 31 Okt -> trial 1 Nov, 14 Nov -> trial 15 Nov. Bisa diubah di /admin/seminar.
update seminars
set trial_starts_at = starts_at + interval '17 hours'
where trial_starts_at is null
  and starts_at in ('2026-10-31 10:00:00+00', '2026-11-14 10:00:00+00');
