// Harga dan durasi mengikuti "Rencana Bisnis Weltgakko" (Oktober 2026).
// Sumber kebenaran harga ada di tabel `programs` Supabase; file ini dipakai
// halaman publik Fase 1 dan harus diselaraskan bila harga berubah.

export type Language = "jp" | "de";

export type Program = {
  slug: string;
  name: string;
  language: Language;
  level: string;
  duration: string;
  monthlyPrice: number | null;
  upfrontPrice: number | null;
  summary: string;
  topics: string[];
  open: boolean;
};

export const programs: Program[] = [
  {
    slug: "kiso",
    name: "Kiso: Hiragana dan Katakana",
    language: "jp",
    level: "Pra-N5",
    duration: "1 bulan, 2x seminggu",
    monthlyPrice: 200_000,
    upfrontPrice: 200_000,
    summary: "Langkah pertama: membaca dan menulis hiragana dan katakana dengan lancar.",
    topics: ["Hiragana dan katakana", "Salam dan perkenalan", "Angka dan waktu"],
    open: true,
  },
  {
    slug: "jlpt-n5",
    name: "JLPT N5",
    language: "jp",
    level: "N5",
    duration: "3 bulan",
    monthlyPrice: 600_000,
    upfrontPrice: 1_500_000,
    summary: "Tata bahasa dasar dan percakapan sehari-hari untuk lulus JLPT N5.",
    topics: ["Tata bahasa dasar", "Sekitar 100 kanji", "Percakapan sehari-hari", "Tes kemampuan setiap Jumat"],
    open: true,
  },
  {
    slug: "jlpt-n4",
    name: "JLPT N4",
    language: "jp",
    level: "N4",
    duration: "3 bulan",
    monthlyPrice: 650_000,
    upfrontPrice: 1_800_000,
    summary: "Melanjutkan N5 ke percakapan kerja dasar dan JLPT N4.",
    topics: ["Sekitar 300 kanji", "Percakapan kerja dasar", "Latihan soal JLPT N4", "Tes kemampuan setiap Jumat"],
    open: true,
  },
  {
    slug: "jlpt-n3",
    name: "JLPT N3",
    language: "jp",
    level: "N3",
    duration: "6 bulan",
    monthlyPrice: 800_000,
    upfrontPrice: 4_500_000,
    summary: "Membaca teks pendek dan memahami percakapan alami untuk JLPT N3.",
    topics: ["Membaca teks pendek", "Mendengar percakapan alami", "Latihan soal JLPT N3", "Tes kemampuan setiap Jumat"],
    open: true,
  },
  {
    slug: "jft-basic",
    name: "JFT-Basic",
    language: "jp",
    level: "N5 + N4",
    duration: "6 bulan",
    monthlyPrice: null,
    upfrontPrice: 3_000_000,
    summary: "Persiapan JFT-Basic untuk jalur kerja Tokutei Ginou di Jepang.",
    topics: ["Materi N5 dan N4", "Simulasi tes JFT-Basic", "Percakapan kerja", "Tes kemampuan setiap Jumat"],
    open: true,
  },
  {
    slug: "jerman-a1",
    name: "Bahasa Jerman A1",
    language: "de",
    level: "A1",
    duration: "2 bulan",
    monthlyPrice: 700_000,
    upfrontPrice: 1_300_000,
    summary: "Dasar bahasa Jerman untuk pemula.",
    topics: ["32 pembelajaran", "Persiapan ujian Goethe, ÖSD atau telc"],
    open: false,
  },
  {
    slug: "jerman-a2",
    name: "Bahasa Jerman A2",
    language: "de",
    level: "A2",
    duration: "2 bulan",
    monthlyPrice: 750_000,
    upfrontPrice: 1_400_000,
    summary: "Melanjutkan A1 ke percakapan sehari-hari.",
    topics: ["32 pembelajaran", "Persiapan ujian Goethe, ÖSD atau telc"],
    open: false,
  },
  {
    slug: "jerman-b1",
    name: "Bahasa Jerman B1",
    language: "de",
    level: "B1",
    duration: "3 bulan",
    monthlyPrice: 900_000,
    upfrontPrice: 2_500_000,
    summary: "Level yang umum diminta untuk Ausbildung di Jerman.",
    topics: ["48 pembelajaran", "Persiapan ujian Goethe, ÖSD atau telc"],
    open: false,
  },
  {
    slug: "jerman-b2",
    name: "Bahasa Jerman B2",
    language: "de",
    level: "B2",
    duration: "4 bulan",
    monthlyPrice: 1_000_000,
    upfrontPrice: 3_600_000,
    summary: "Bahasa Jerman mandiri untuk kerja dan studi.",
    topics: ["64 pembelajaran", "Persiapan ujian Goethe, ÖSD atau telc"],
    open: false,
  },
];

export function getProgram(slug: string) {
  return programs.find((p) => p.slug === slug);
}

export function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

// Ilustrasi program di public/images (dibuat dengan Gemini, 4:3). Program Jerman memakai satu gambar.
const programImages: Record<string, { src: string; alt: string }> = {
  kiso: { src: "/images/program-kiso.jpg", alt: "Ilustrasi belajar menulis hiragana dan katakana dengan flashcard" },
  "jlpt-n5": { src: "/images/program-n5.jpg", alt: "Ilustrasi anak muda mulai ngobrol bahasa Jepang dasar" },
  "jlpt-n4": { src: "/images/program-n4.jpg", alt: "Ilustrasi anak muda memakai bahasa Jepang saat bekerja" },
  "jlpt-n3": { src: "/images/program-n3.jpg", alt: "Ilustrasi membaca manga di tablet dengan sertifikat N3" },
  "jft-basic": { src: "/images/program-jft.jpg", alt: "Ilustrasi paspor, koper, dan pesawat menuju kerja di Jepang" },
};
const germanImage = { src: "/images/program-jerman.jpg", alt: "Ilustrasi belajar bahasa Jerman dengan Gerbang Brandenburg" };

export function programImage(program: Program) {
  return programImages[program.slug] ?? (program.language === "de" ? germanImage : null);
}
