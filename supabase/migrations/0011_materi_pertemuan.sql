-- Materi per pertemuan untuk semua batch satu program.
-- meeting_no = urutan sesi kelas (bukan tes Jumat) di batch: 1 = kelas pertama.
-- Materi program tanpa meeting_no tetap tampil sebagai materi umum.
alter table materials add column if not exists meeting_no int check (meeting_no between 1 and 200);
create index if not exists materials_program_meeting_idx on materials (program_id, meeting_no);
