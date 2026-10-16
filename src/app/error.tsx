"use client";

import { useEffect } from "react";
import { buttonClass } from "@/components/ui/form";

export default function PageError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <h1 className="text-xl font-semibold text-stone-900">Halaman gagal dimuat</h1>
      <p className="mt-2 text-sm text-stone-600">Coba muat ulang. Kalau masih gagal, kirim kode berikut ke admin.</p>
      {error.digest && <p className="mt-2 font-mono text-xs text-stone-500">{error.digest}</p>}
      <button onClick={() => retry()} className={`${buttonClass} mt-6`}>
        Muat ulang
      </button>
    </div>
  );
}
