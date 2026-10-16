import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { SignOutButton } from "@/components/auth-forms";
import { Notice } from "@/components/ui/form";
import { requireDb, requireUser, type CurrentUser } from "@/lib/auth";
import { formatDate, formatDateTime } from "@/lib/format";
import { formatRupiah } from "@/lib/programs";
import { withBase } from "@/lib/base-path";

export const metadata: Metadata = { title: "Area belajar", robots: { index: false } };

// Tombol masuk kelas aktif 15 menit sebelum mulai sampai 2 jam setelahnya.
const OPEN_BEFORE_MS = 15 * 60_000;
const OPEN_AFTER_MS = 2 * 3600_000;

// Waktu permintaan; halaman ini selalu dirender per request karena membaca sesi login.
function requestTime() {
  return Date.now();
}

export default async function LearnPage() {
  // Cek login sebelum streaming dimulai, supaya pengunjung tanpa sesi mendapat redirect HTTP biasa.
  const user = await requireUser("/belajar");
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <Suspense fallback={<p className="text-stone-500">Memuat kelas kamu...</p>}>
        <LearnContent user={user} />
      </Suspense>
    </div>
  );
}

type Enrollment = {
  id: string;
  status: string;
  plan: string;
  batch_id: string;
  batches: {
    id: string;
    name: string;
    start_date: string;
    schedule_label: string;
    meeting_url: string | null;
    programs: { id: string; name: string };
    sessions: { id: string; number: number; starts_at: string; kind: string; topic: string | null }[];
  };
  invoices: { code: string; status: string; amount: number; installment_no: number; due_at: string }[];
};

async function LearnContent({ user }: { user: CurrentUser }) {
  const db = requireDb();

  const { data, error } = await db
    .from("enrollments")
    .select(
      "id, status, plan, batch_id, batches(id, name, start_date, schedule_label, meeting_url, programs(id, name), sessions(id, number, starts_at, kind, topic)), invoices(code, status, amount, installment_no, due_at)",
    )
    .eq("profile_id", user.id)
    .neq("status", "keluar")
    .order("created_at", { ascending: false });
  if (error) console.error("Gagal memuat kelas", error.code, error.message);
  const enrollments = (data ?? []) as unknown as Enrollment[];

  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-stone-900">Halo, {user.fullName.split(" ")[0]}</h1>
          <p className="text-stone-600">Area belajar Weltgakkou</p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          {user.role === "admin" && (
            <Link href="/admin" className="font-semibold text-red-700">
              Admin
            </Link>
          )}
          <SignOutButton />
        </div>
      </div>

      {error && (
        <div className="mt-8">
          <Notice tone="error">Data kelas sedang tidak bisa dimuat. Coba lagi sebentar lagi atau hubungi admin.</Notice>
        </div>
      )}

      {!error && enrollments.length === 0 && (
        <div className="mt-8">
          <Notice tone="info">
            Kamu belum terdaftar di kelas mana pun.{" "}
            <Link href="/#program" className="font-semibold underline">
              Lihat program
            </Link>
          </Notice>
        </div>
      )}

      {enrollments.map((e) => (
        <EnrollmentCard key={e.id} enrollment={e} userId={user.id} />
      ))}
    </>
  );
}

async function EnrollmentCard({ enrollment: e, userId }: { enrollment: Enrollment; userId: string }) {
  const db = requireDb();
  const batch = e.batches;
  const sessions = [...(batch.sessions ?? [])].sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const openInvoice = (e.invoices ?? []).find((i) => i.status === "belum" || i.status === "ditolak");

  if (e.status === "menunggu_bayar") {
    return (
      <section className="mt-8 rounded-xl border border-stone-200 bg-white p-6">
        <h2 className="text-xl font-semibold text-stone-900">
          {batch.programs.name} · {batch.name}
        </h2>
        <p className="mt-2 text-stone-700">Kelas aktif setelah pembayaran pertama dikonfirmasi.</p>
        {openInvoice && (
          <Link href={`/bayar/${openInvoice.code}`} className="mt-3 inline-block font-semibold text-red-700 underline">
            Lihat tagihan {formatRupiah(openInvoice.amount)}
          </Link>
        )}
      </section>
    );
  }

  const sessionIds = sessions.map((s) => s.id);
  const [materialsRes, attendanceRes, resultsRes] = await Promise.all([
    db
      .from("materials")
      .select("id, title, kind, url, session_id")
      .or(`program_id.eq.${batch.programs.id}${sessionIds.length ? `,session_id.in.(${sessionIds.join(",")})` : ""}`)
      .order("created_at"),
    sessionIds.length
      ? db.from("attendance").select("session_id").eq("profile_id", userId).in("session_id", sessionIds)
      : Promise.resolve({ data: [] as { session_id: string }[] }),
    db.from("exam_results").select("score, exams(title, max_score, session_id)").eq("profile_id", userId),
  ]);

  const now = requestTime();
  const next = sessions.find((s) => new Date(s.starts_at).getTime() + OPEN_AFTER_MS > now);
  const canJoin = next && new Date(next.starts_at).getTime() - OPEN_BEFORE_MS <= now;
  const past = sessions.filter((s) => s.kind === "kelas" && new Date(s.starts_at).getTime() < now);
  const attended = new Set((attendanceRes.data ?? []).map((a) => a.session_id));
  const attendedPast = past.filter((s) => attended.has(s.id)).length;

  const results = ((resultsRes.data ?? []) as unknown as { score: number; exams: { title: string; max_score: number; session_id: string } }[]).filter(
    (r) => sessionIds.includes(r.exams.session_id),
  );
  const avg = results.length ? results.reduce((sum, r) => sum + (r.score / r.exams.max_score) * 100, 0) / results.length : null;

  return (
    <section className="mt-8 space-y-6">
      <div className="rounded-xl border border-stone-200 bg-white p-6">
        <p className="text-sm text-stone-500">{batch.schedule_label}</p>
        <h2 className="text-xl font-semibold text-stone-900">
          {batch.programs.name} · {batch.name}
        </h2>

        {next ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-lg bg-stone-50 p-4">
            <div>
              <p className="text-sm text-stone-500">{next.kind === "ujian" ? "Ujian berikutnya" : "Kelas berikutnya"}</p>
              <p className="font-semibold text-stone-900">
                {formatDateTime(next.starts_at)} WIB{next.topic ? ` · ${next.topic}` : ""}
              </p>
            </div>
            {canJoin ? (
              <a href={withBase(`/belajar/masuk/${next.id}`)} className="rounded-lg bg-red-700 px-5 py-2.5 font-semibold text-white hover:bg-red-800">
                Masuk kelas
              </a>
            ) : (
              <span className="text-sm text-stone-500">Tombol masuk aktif 15 menit sebelum mulai</span>
            )}
          </div>
        ) : (
          <p className="mt-4 text-stone-600">Semua sesi batch ini sudah selesai.</p>
        )}

        <dl className="mt-4 grid grid-cols-3 gap-4 text-center">
          <div>
            <dt className="text-xs text-stone-500">Kehadiran</dt>
            <dd className="text-lg font-semibold text-stone-900">
              {past.length ? `${Math.round((attendedPast / past.length) * 100)}%` : "-"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-stone-500">Rata-rata ujian</dt>
            <dd className="text-lg font-semibold text-stone-900">{avg === null ? "-" : Math.round(avg)}</dd>
          </div>
          <div>
            <dt className="text-xs text-stone-500">Sesi</dt>
            <dd className="text-lg font-semibold text-stone-900">
              {sessions.filter((s) => new Date(s.starts_at).getTime() < now).length}/{sessions.length}
            </dd>
          </div>
        </dl>
        <p className="mt-2 text-xs text-stone-500">Sertifikat kursus: kehadiran minimal 80% dan rata-rata ujian minimal 60.</p>

        {openInvoice && (
          <div className="mt-4">
            <Notice tone="info">
              Tagihan cicilan ke-{openInvoice.installment_no} {formatRupiah(openInvoice.amount)} jatuh tempo{" "}
              {formatDate(openInvoice.due_at)}.{" "}
              <Link href={`/bayar/${openInvoice.code}`} className="font-semibold underline">
                Bayar sekarang
              </Link>
            </Notice>
          </div>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-stone-200 bg-white p-6">
          <h3 className="font-semibold text-stone-900">Materi</h3>
          {(materialsRes.data ?? []).length === 0 ? (
            <p className="mt-2 text-sm text-stone-500">Materi akan muncul di sini setelah diunggah pengajar.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {(materialsRes.data ?? []).map((m) => (
                <li key={m.id}>
                  <a href={m.url} target="_blank" rel="noreferrer" className="text-red-700 hover:underline">
                    {m.title}
                  </a>{" "}
                  <span className="text-stone-400">{m.kind}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-stone-200 bg-white p-6">
          <h3 className="font-semibold text-stone-900">Nilai ujian</h3>
          {results.length === 0 ? (
            <p className="mt-2 text-sm text-stone-500">Belum ada nilai.</p>
          ) : (
            <ul className="mt-3 space-y-1 text-sm">
              {results.map((r) => (
                <li key={r.exams.session_id} className="flex justify-between">
                  <span>{r.exams.title}</span>
                  <span className="font-semibold">
                    {r.score}/{r.exams.max_score}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <details className="rounded-xl border border-stone-200 bg-white p-6">
        <summary className="cursor-pointer font-semibold text-stone-900">Jadwal lengkap ({sessions.length} sesi)</summary>
        <ol className="mt-3 space-y-1 text-sm">
          {sessions.map((s) => (
            <li key={s.id} className="flex justify-between border-b border-stone-100 py-1">
              <span>
                {s.number}. {s.kind === "ujian" ? "Ujian" : "Kelas"}
                {s.topic ? ` · ${s.topic}` : ""}
              </span>
              <span className="text-stone-600">
                {formatDateTime(s.starts_at)}
                {attended.has(s.id) ? " · hadir" : ""}
              </span>
            </li>
          ))}
        </ol>
      </details>
    </section>
  );
}
