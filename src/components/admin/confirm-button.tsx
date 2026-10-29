"use client";

import { useRef, useState, type ReactNode } from "react";

// Tombol untuk aksi admin yang berisiko (keluarkan siswa, hapus, ubah peran, dll.).
// Klik pertama hanya membuka dialog konfirmasi; aksi baru jalan setelah tombol "Ya, ..." ditekan.
// Tanpa onConfirm, tombol "Ya" men-submit <form> tempat tombol ini berada (cocok untuk server action di halaman server).
// confirmText: untuk aksi yang sangat berat (mis. hapus siswa yang sudah bayar), tombol "Ya" baru aktif setelah teks ini diketik.
export function ConfirmButton({
  children,
  className,
  title,
  message,
  confirmLabel,
  danger = true,
  disabled,
  confirmText,
  onConfirm,
}: {
  children: ReactNode;
  className?: string;
  title: string;
  message: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  disabled?: boolean;
  confirmText?: string;
  onConfirm?: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [typed, setTyped] = useState("");
  const close = () => dialog.current?.close();
  const locked = Boolean(confirmText) && typed.trim().toUpperCase() !== confirmText?.toUpperCase();

  return (
    <>
      <button type="button" className={className} disabled={disabled} onClick={() => {
          setTyped("");
          dialog.current?.showModal();
        }}>
        {children}
      </button>
      <dialog
        ref={dialog}
        className="m-auto w-[min(92vw,26rem)] rounded-xl p-0 text-left shadow-xl backdrop:bg-stone-900/50"
        onClick={(e) => {
          // Klik di luar kotak (area gelap) = batal.
          if (e.target === e.currentTarget) close();
        }}
      >
        <div className="space-y-3 p-5">
          <p className="text-base font-semibold text-stone-900">{title}</p>
          <div className="text-sm text-stone-700">{message}</div>
          {confirmText && (
            <label className="block text-sm text-stone-700">
              Ketik <span className="font-mono font-semibold">{confirmText}</span> untuk melanjutkan
              <input
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                autoComplete="off"
                className="mt-1 block w-full rounded-lg border border-stone-300 px-3 py-2 font-mono text-sm"
              />
            </label>
          )}
          <div className="flex flex-wrap justify-end gap-2 pt-2">
            <button
              type="button"
              autoFocus
              onClick={close}
              className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
            >
              Batal
            </button>
            <button
              type={onConfirm ? "button" : "submit"}
              disabled={locked}
              onClick={() => {
                close();
                onConfirm?.();
              }}
              className={`rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ${danger ? "bg-red-600 hover:bg-red-700" : "bg-emerald-600 hover:bg-emerald-700"}`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
