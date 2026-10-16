import Link from "next/link";

export function PageTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-stone-900 sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-stone-600">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Card({ title, count, action, children, className = "" }: { title?: string; count?: number; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-stone-200 bg-white p-5 ${className}`}>
      {(title || action) && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          {title && (
            <h2 className="font-semibold text-stone-900">
              {title}
              {count !== undefined && <span className="ml-2 font-normal text-stone-500">{count}</span>}
            </h2>
          )}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Stat({ label, value, hint, href, tone = "plain" }: { label: string; value: string | number; hint?: string; href?: string; tone?: "plain" | "alert" }) {
  const body = (
    <>
      <p className="text-sm text-stone-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${tone === "alert" && value !== 0 ? "text-red-700" : "text-stone-900"}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-stone-500">{hint}</p>}
    </>
  );
  const cls = "block rounded-xl border border-stone-200 bg-white p-4";
  return href ? (
    <Link href={href} className={`${cls} hover:border-stone-400`}>
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
          className={`rounded-full px-3 py-1 ${current === o.value ? "bg-stone-900 text-white" : "bg-white text-stone-700 ring-1 ring-stone-200 hover:ring-stone-400"}`}
        >
          {o.label}
          {o.count !== undefined && <span className="ml-1 opacity-70">{o.count}</span>}
        </Link>
      ))}
    </div>
  );
}

export const tableClass = "w-full text-left text-sm";
export const thClass = "px-3 py-2 font-medium text-stone-500";
export const tdClass = "px-3 py-2 align-top";
export const smallButton = "rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-800 hover:bg-stone-50 disabled:opacity-60";

// Palet kategori (urutan tetap, lolos uji buta warna) untuk membedakan program.
export const seriesColors = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#6250d6", "#e34948"];
export const chartColor = seriesColors[0];
