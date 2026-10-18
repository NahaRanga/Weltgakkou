import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SignUpForm } from "@/components/signup-form";
import { getCurrentUser } from "@/lib/auth";
import { withBase } from "@/lib/base-path";
import { googleLoginEnabled } from "@/lib/google-login";
import { programs } from "@/lib/programs";
import { pageMetadata } from "@/lib/seo";

export const metadata = {
  ...pageMetadata({
    title: "Daftar akun",
    description: "Buat akun Weltgakko gratis: zona latihan, kelas trial, dan pantau pendaftaran kelas bahasa Jepang online di satu tempat.",
    path: "/daftar",
  }),
  robots: { index: false },
};

// Keuntungan punya akun, ditampilkan di kiri form (seperti halaman program).
const benefits = [
  { title: "Zona latihan gratis", text: "Tes penempatan, mini tryout, dan kuis hiragana untuk tahu level kamu sekarang." },
  { title: "Kelas trial lebih cepat", text: "Data kamu sudah tersimpan, tinggal pilih jadwal kelas trial gratis." },
  { title: "Daftar batch tanpa isi ulang", text: "Pendaftaran, tagihan, dan status pembayaran terpantau di satu halaman." },
  { title: "Area belajar", text: "Setelah ikut kelas: jadwal, link Zoom, rekaman pengganti, dan materi." },
  { title: "Kabar batch baru", text: "Pilih program yang kamu minati, tim kami mengabari lewat WhatsApp saat batch dibuka." },
];

export default async function SignUpPage() {
  if (await getCurrentUser()) redirect("/belajar");
  const options = programs.map(({ slug, name }) => ({ slug, name }));

  return (
    <div className="mx-auto grid max-w-5xl gap-10 px-4 py-12 lg:grid-cols-[1fr_400px]">
      <div>
        <p className="text-sm font-medium text-red-700">Gratis</p>
        <h1 className="mt-1 text-3xl font-bold text-stone-900">Buat akun Weltgakko</h1>
        <p className="mt-3 text-lg text-stone-600">Satu akun untuk latihan, kelas trial, dan kelas bahasa Jepang online.</p>
        <Image
          src={withBase("/images/kelas-online.jpg")}
          alt="Ilustrasi belajar bahasa Jepang online"
          width={1200}
          height={896}
          priority
          className="mt-6 w-full rounded-2xl sm:max-w-lg"
        />
        <h2 className="mt-10 text-xl font-semibold text-stone-900">Kenapa punya akun?</h2>
        <ul className="mt-4 space-y-4">
          {benefits.map((b, i) => (
            <li key={b.title} className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-50 text-sm font-bold text-red-700">{i + 1}</span>
              <span>
                <span className="block font-semibold text-stone-900">{b.title}</span>
                <span className="text-stone-600">{b.text}</span>
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-8 text-sm text-stone-600">
          Mau langsung ikut kelas? Lihat{" "}
          <Link href="/#program" className="font-medium text-red-700 hover:underline">
            program dan batch yang dibuka
          </Link>
          .
        </p>
      </div>

      <div className="lg:pt-10">
        <div className="rounded-2xl border-2 border-red-700 bg-white p-6 lg:sticky lg:top-24">
          <h2 className="mb-1 text-xl font-semibold text-stone-900">Daftar akun</h2>
          <p className="mb-5 text-sm text-stone-600">Gratis, tanpa bayar apa pun.</p>
          <SignUpForm programs={options} google={googleLoginEnabled()} />
        </div>
      </div>
    </div>
  );
}
