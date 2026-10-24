import Link from "next/link";

export function PageTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="border-l-4 border-brand pl-3 text-2xl font-bold text-stone-900 sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 pl-4 text-stone-600">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Card({ title, count, action, children, className = "" }: { title?: string; count?: number; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`overflow-hidden rounded-xl border border-sand bg-white p-5 shadow-sm ${className}`}>
      {(title || action) && (
        <div className="-mx-5 -mt-5 mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-sand bg-[#fbf5ec] px-5 py-3">
          {title && (
            <h2 className="flex items-center gap-2 font-semibold text-stone-900">
              <span className="h-4 w-1 rounded-full bg-brand" aria-hidden />
              {title}
              {count !== undefined && <span className="rounded-full bg-brand px-2 text-xs font-semibold leading-5 text-white">{count}</span>}
            </h2>
          )}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

// Warna kartu angka. "alert" = merah hanya bila angkanya bukan 0 (ada yang perlu dicek).
const statTones = {
  plain: { box: "border-sand bg-white", value: "text-stone-900" },
  merah: { box: "border-red-200 bg-red-50", value: "text-red-800" },
  kuning: { box: "border-amber-200 bg-amber-50", value: "text-amber-800" },
  hijau: { box: "border-emerald-200 bg-emerald-50", value: "text-emerald-800" },
  biru: { box: "border-sky-200 bg-sky-50", value: "text-sky-800" },
  ungu: { box: "border-violet-200 bg-violet-50", value: "text-violet-800" },
};
type StatTone = keyof typeof statTones | "alert";

export function Stat({ label, value, hint, href, tone = "plain" }: { label: string; value: string | number; hint?: string; href?: string; tone?: StatTone }) {
  const t = statTones[tone === "alert" ? (value !== 0 ? "merah" : "plain") : tone];
  const body = (
    <>
      <p className="text-sm font-medium text-stone-600">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${t.value}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-stone-500">{hint}</p>}
    </>
  );
  const cls = `block rounded-xl border p-4 shadow-sm ${t.box}`;
  return href ? (
    <Link href={href} className={`${cls} transition hover:-translate-y-0.5 hover:shadow-md`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

const badgeTones: Record<string, string> = {
  // status tagihan
  belum: "bg-amber-100 text-amber-900",
  menunggu_verifikasi: "bg-sky-100 text-sky-900",
  lunas: "bg-emerald-100 text-emerald-900",
  ditolak: "bg-red-100 text-red-800",
  kedaluwarsa: "bg-stone-200 text-stone-600",
  // status pendaftaran
  menunggu_bayar: "bg-amber-100 text-amber-900",
  aktif: "bg-emerald-100 text-emerald-900",
  selesai: "bg-stone-200 text-stone-700",
  keluar: "bg-stone-200 text-stone-500",
  // status batch
  buka: "bg-sky-100 text-sky-900",
  berjalan: "bg-emerald-100 text-emerald-900",
  // paket rekaman
  dijual: "bg-emerald-100 text-emerald-900",
  // waiting list
  baru: "bg-amber-100 text-amber-900",
  dihubungi: "bg-sky-100 text-sky-900",
  daftar: "bg-emerald-100 text-emerald-900",
  batal: "bg-stone-200 text-stone-500",
  // peran
  admin: "bg-red-100 text-red-800",
  pengajar: "bg-violet-100 text-violet-900",
  konten: "bg-sky-100 text-sky-900",
  siswa: "bg-stone-100 text-stone-700",
};

const labels: Record<string, string> = {
  menunggu_verifikasi: "Cek bukti",
  menunggu_bayar: "Menunggu bayar",
  kedaluwarsa: "Kedaluwarsa",
  belum_dijual: "Belum dijual",
};

export function Badge({ value }: { value: string }) {
  const text = labels[value] ?? value.charAt(0).toUpperCase() + value.slice(1);
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${badgeTones[value] ?? "bg-stone-100 text-stone-700"}`}>{text}</span>;
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-stone-500">{children}</p>;
}

export function WaLink({ number, text }: { number: string | null | undefined; text?: string }) {
  if (!number) return null;
  return (
    <a href={`https://wa.me/${number}${text ? `?text=${encodeURIComponent(text)}` : ""}`} target="_blank" rel="noreferrer" className="text-sm font-medium text-emerald-700 hover:underline">
      WA
    </a>
  );
}

// Filter berupa link (?status=...), supaya bisa dipakai tanpa JavaScript.
export function FilterTabs({ base, param, current, options }: { base: string; param: string; current: string; options: { value: string; label: string; count?: number }[] }) {
  return (
    <div className="mb-4 flex flex-wrap gap-2 text-sm">
      {options.map((o) => (
        <Link
          key={o.value}
          href={o.value ? `${base}${base.includes("?") ? "&" : "?"}${param}=${o.value}` : base}
          className={`rounded-full px-3 py-1 ${current === o.value ? "bg-brand font-medium text-white" : "bg-white text-stone-700 ring-1 ring-sand hover:ring-brand/50"}`}
        >
          {o.label}
          {o.count !== undefined && <span className="ml-1 opacity-70">{o.count}</span>}
        </Link>
      ))}
    </div>
  );
}

export const tableClass = "w-full text-left text-sm";
export const thClass = "bg-[#f6ead9] px-3 py-2 font-semibold text-stone-700";
export const tdClass = "px-3 py-2 align-top";
export const smallButton = "rounded-lg border border-sand bg-white px-3 py-1.5 text-sm font-medium text-stone-800 hover:bg-stone-50 disabled:opacity-60";

// Palet kategori (urutan tetap, lolos uji buta warna) untuk membedakan program.
export const seriesColors = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#6250d6", "#e34948"];
export const chartColor = seriesColors[0];
