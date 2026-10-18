// Halaman informasi pendukung, dipakai untuk menu Info, footer, dan navigasi antarhalaman.
// Urutannya sengaja berupa alur baca: dari jalur ke Jepang sampai kontak.
export const infoPages = [
  { href: "/jalur-ke-jepang", title: "Jalur ke Jepang", menu: "Jalur ke Jepang", image: "/images/jalur-ke-jepang.jpg", blurb: "Magang, Tokutei Ginou, dan studi, plus timeline dari nol sampai berangkat." },
  { href: "/kurikulum", title: "Kurikulum dan lama kursus", menu: "Kurikulum", image: "/images/kurikulum.jpg", blurb: "Materi tiap bulan di setiap program dan berapa lama sampai level tertentu." },
  { href: "/cara-belajar", title: "Cara belajar", menu: "Cara belajar", image: "/images/kelas-online.jpg", blurb: "Alur mingguan kelas live, tes Jumat, rekaman, dan pilihan paket." },
  { href: "/bidang-kerja", title: "Bidang kerja Tokutei Ginou", menu: "Bidang kerja", image: "/images/bidang-kerja.jpg", blurb: "Sektor kerja SSW beserta istilah Jepangnya dan kosakata yang perlu disiapkan." },
  { href: "/persyaratan", title: "Persyaratan umum", menu: "Persyaratan", image: "/images/persyaratan.jpg", blurb: "Syarat dan dokumen yang biasanya diminta untuk kerja atau studi di Jepang." },
  { href: "/tentang", title: "Tentang Weltgakko", menu: "Tentang kami", image: "/images/tentang-kontak.jpg", blurb: "Siapa kami dan bagaimana kami mengajar." },
  { href: "/kontak", title: "Kontak", menu: "Kontak", image: "/images/tentang-kontak.jpg", blurb: "WhatsApp dan sosial media Weltgakko." },
] as const;

// Link "Coba kelas gratis". Sementara ke waiting list sampai halaman /trial (P7) ada.
export const trialHref = "/waiting-list";
