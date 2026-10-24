-- Zona latihan gratis: tes penempatan, mini tryout, dan akun gratis (cuma login).
-- Jalankan setelah 0005_trial_tenggat.sql (kelas trial dipakai untuk tingkatan akses). Aman diulang.
-- Soal disimpan di database (bukan di repo) supaya admin bisa menambah sendiri.

-- Pertanyaan awal latihan (sekali saja) dan tanda peserta yang hadir kelas trial.
-- learning_goal dan prior_level sudah ada sejak 0003.
alter table profiles add column if not exists been_to_japan boolean;
alter table profiles add column if not exists ssw_field text;
alter table profiles add column if not exists practice_onboarded_at timestamptz;
alter table profiles add column if not exists trial_attended_at timestamptz;

create table if not exists quizzes (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{3,40}$'),
  kind text not null check (kind in ('penempatan', 'tryout')),
  title text not null,
  description text,
  duration_minutes integer not null default 15 check (duration_minutes between 1 and 180),
  published boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now()
);
alter table quizzes enable row level security;

create table if not exists quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references quizzes (id) on delete cascade,
  section text not null check (section in ('kosakata', 'tata_bahasa', 'percakapan', 'mendengar', 'membaca')),
  position integer not null default 0,
  prompt text not null,
  image_url text,
  audio_url text,
  choices text[] not null check (array_length(choices, 1) between 2 and 4),
  answer smallint not null check (answer >= 0 and answer < array_length(choices, 1)),
  explanation text,
  -- Soal yang boleh dicoba tamu tanpa login (maksimal 3 ditampilkan).
  preview boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists quiz_questions_quiz on quiz_questions (quiz_id, position);
alter table quiz_questions enable row level security;

-- Satu baris per percobaan. Dibuat saat tombol Mulai ditekan (ikut dihitung jatah),
-- dinilai di server saat dikirim. section_scores: {"kosakata": [benar, jumlah], ...}.
create table if not exists quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references quizzes (id) on delete cascade,
  profile_id uuid not null references profiles (id) on delete cascade,
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  score integer,
  total integer,
  section_scores jsonb,
  answers jsonb
);
create index if not exists quiz_attempts_profile on quiz_attempts (profile_id, quiz_id);
create index if not exists quiz_attempts_quiz on quiz_attempts (quiz_id, started_at desc);
alter table quiz_attempts enable row level security;

-- Soal contoh sementara buatan Weltgakko (bukan salinan situs lain), supaya mesin tes
-- bisa dicoba. Kedua tes belum dipublikasikan: ganti dengan soal dari Nurdin dulu,
-- lalu centang "Tampilkan" di /admin/latihan.
insert into quizzes (slug, kind, title, description, duration_minutes, position)
values
  ('tes-penempatan', 'penempatan', 'Tes penempatan level',
   'Cari tahu kamu cocok mulai dari Kiso, N5, atau N4. Hasilnya langsung menyarankan kelas.', 10, 1),
  ('mini-tryout-jft-1', 'tryout', 'Mini tryout JFT-Basic 1',
   'Format mirip JFT-Basic: kosakata, percakapan, mendengar, dan membaca. Skor muncul per bagian.', 20, 2)
on conflict (slug) do nothing;

insert into quiz_questions (quiz_id, section, position, prompt, choices, answer, explanation, preview)
select q.id, s.section, s.position, s.prompt, s.choices, s.answer, s.explanation, s.preview
from quizzes q
join (values
  ('tes-penempatan', 'kosakata', 1, '[CONTOH] 「ねこ」 artinya ...', array['kucing', 'anjing', 'ikan', 'burung'], 0, 'ねこ (neko) = kucing. いぬ = anjing, さかな = ikan, とり = burung.', false),
  ('tes-penempatan', 'kosakata', 2, '[CONTOH] 「でんしゃ」 artinya ...', array['mobil', 'kereta', 'sepeda', 'pesawat'], 1, 'でんしゃ (densha) = kereta listrik.', false),
  ('tes-penempatan', 'tata_bahasa', 3, '[CONTOH] わたし（　）がくせいです。', array['を', 'に', 'は', 'で'], 2, 'Partikel は menandai topik kalimat: "Saya adalah pelajar."', false),
  ('tes-penempatan', 'tata_bahasa', 4, '[CONTOH] あした ともだち（　）えいがを みます。', array['と', 'を', 'が', 'へ'], 0, 'と = bersama (seseorang). "Besok saya menonton film bersama teman."', false),
  ('tes-penempatan', 'tata_bahasa', 5, '[CONTOH] ここで しゃしんを（　）も いいですか。', array['とる', 'とって', 'とった', 'とらない'], 1, 'Pola 〜てもいいですか (bolehkah ...) memakai bentuk て: とって.', false),
  ('tes-penempatan', 'membaca', 6, '[CONTOH] 「リナさんは まいあさ 6じに おきます。それから パンを たべます。」 Apa yang Rina lakukan setelah bangun?', array['Minum kopi', 'Makan roti', 'Mandi', 'Berangkat kerja'], 1, 'それから = setelah itu. パンを たべます = makan roti.', false),
  ('mini-tryout-jft-1', 'kosakata', 1, '[CONTOH] Kanji untuk 「やすみ」 adalah ...', array['休み', '体み', '林み', '木み'], 0, '休み (yasumi) = libur/istirahat. Kanji 休 = orang (亻) bersandar di pohon (木).', true),
  ('mini-tryout-jft-1', 'kosakata', 2, '[CONTOH] Katakana 「コーヒー」 dibaca ...', array['kōhī', 'kōra', 'kēki', 'kopī'], 0, 'コーヒー = kōhī (kopi). Garis ー memanjangkan bunyi.', true),
  ('mini-tryout-jft-1', 'percakapan', 3, '[CONTOH] Kamu pulang kerja lebih dulu dari rekan kerja. Kamu bilang ...', array['いってきます', 'おさきに しつれいします', 'ただいま', 'いらっしゃいませ'], 1, 'おさきに しつれいします = permisi, saya pulang duluan. Ungkapan wajib di tempat kerja Jepang.', true),
  ('mini-tryout-jft-1', 'percakapan', 4, '[CONTOH] A: 「すみません、トイレは どこですか。」 B: 「（　）」', array['あちらです。', '3じです。', '500えんです。', 'はい、げんきです。'], 0, 'Pertanyaan どこ (di mana) dijawab dengan tempat: あちらです (di sebelah sana).', false),
  ('mini-tryout-jft-1', 'membaca', 5, '[CONTOH] Papan di toko: 「えいぎょう 10:00〜19:00 ／ かようび やすみ」. Kapan toko tutup?', array['Setiap Senin', 'Setiap Selasa', 'Setiap hari pukul 10.00', 'Setiap Minggu'], 1, 'かようび = hari Selasa, やすみ = libur.', false),
  ('mini-tryout-jft-1', 'membaca', 6, '[CONTOH] 「この へやで たばこを すわないで ください。」 Artinya ...', array['Silakan merokok di ruangan ini', 'Jangan merokok di ruangan ini', 'Rokok dijual di ruangan ini', 'Ruangan ini untuk perokok'], 1, '〜ないでください = tolong jangan .... すう = mengisap (rokok).', false)
) as s (slug, section, position, prompt, choices, answer, explanation, preview) on s.slug = q.slug
where not exists (select 1 from quiz_questions x where x.quiz_id = q.id);
