"use client";

import { useActionState } from "react";
import { uploadProof, type UploadState } from "@/app/(site)/bayar/[code]/actions";
import { buttonClass, Notice } from "@/components/ui/form";

export function UploadProofForm({ code }: { code: string }) {
  const [state, action, pending] = useActionState(uploadProof.bind(null, code), {} as UploadState);
  if (state.ok) {
    return (
      <Notice tone="ok">
        Bukti pembayaran terkirim. Admin akan mengecek mutasi dan mengirim link login ke email kamu setelah
        dikonfirmasi.
      </Notice>
    );
  }
  return (
    <form action={action} className="space-y-3">
      {state.error && <Notice tone="error">{state.error}</Notice>}
      <div className="flex gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input type="radio" name="method" value="transfer" defaultChecked /> Transfer bank
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" name="method" value="qris" /> QRIS
        </label>
      </div>
      <input
        type="file"
        name="proof"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        required
        className="block w-full text-sm text-stone-700 file:mr-3 file:rounded-lg file:border-0 file:bg-stone-200 file:px-3 file:py-2 file:font-medium"
      />
      <button className={`${buttonClass} w-full`} disabled={pending}>
        {pending ? "Mengunggah..." : "Kirim bukti pembayaran"}
      </button>
    </form>
  );
}
