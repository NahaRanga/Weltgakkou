"use client";

import { useTransition } from "react";
import { markSeminarSent } from "@/app/admin/seminar/actions";
import type { ReminderKind } from "@/lib/seminars";

// Tombol buka WA dengan pesan siap kirim, sekaligus menandai "sudah dikirim".
export function SeminarWaButton({
  id,
  kind,
  label,
  number,
  text,
  sentAt,
  disabledReason,
}: {
  id: string;
  kind: ReminderKind;
  label: string;
  number: string;
  text: string;
  sentAt: string | null;
  disabledReason?: string;
}) {
  const [pending, start] = useTransition();

  if (disabledReason) {
    return (
      <span title={disabledReason} className="inline-block cursor-not-allowed rounded px-2 py-0.5 text-xs text-stone-400 ring-1 ring-stone-200">
        {label}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1">
      <a
        href={`https://wa.me/${number}?text=${encodeURIComponent(text)}`}
        target="_blank"
        rel="noreferrer"
        onClick={() => start(() => markSeminarSent(id, kind))}
        className={`rounded px-2 py-0.5 text-xs font-medium ${sentAt ? "bg-emerald-100 text-emerald-800" : "bg-emerald-700 text-white hover:bg-emerald-800"} ${pending ? "opacity-60" : ""}`}
      >
        {sentAt ? `✓ ${label}` : label}
      </a>
      {sentAt && (
        <button type="button" title="Hapus tanda terkirim" onClick={() => start(() => markSeminarSent(id, kind, true))} className="text-xs text-stone-400 hover:text-stone-700">
          ×
        </button>
      )}
    </span>
  );
}
