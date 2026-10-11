export const inputClass =
  "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-900 focus:border-red-700 focus:outline-none focus:ring-2 focus:ring-red-700/20";

export const buttonClass =
  "rounded-lg bg-red-700 px-4 py-2.5 font-semibold text-white hover:bg-red-800 disabled:opacity-60";

export function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-stone-700">{label}</span>
      {children}
      {error && <span className="mt-1 block text-sm text-red-700">{error}</span>}
    </label>
  );
}

export function Notice({ tone, children }: { tone: "error" | "ok" | "info"; children: React.ReactNode }) {
  const cls = {
    error: "bg-red-50 text-red-800",
    ok: "bg-emerald-50 text-emerald-900",
    info: "bg-stone-100 text-stone-800",
  }[tone];
  return (
    <p className={`rounded-lg p-3 text-sm ${cls}`} role={tone === "error" ? "alert" : "status"}>
      {children}
    </p>
  );
}
