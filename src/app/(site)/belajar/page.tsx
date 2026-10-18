import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { SignOutButton } from "@/components/auth-forms";
import { Notice } from "@/components/ui/form";
import {
  EmptyLearnState,
  FirstClassGuide,
  HelpButton,
  InvoiceHistory,
  PendingEnrollment,
  TrustPoints,
  teacherLabel,
  type StudentInvoice,
} from "@/components/belajar";
import { requireDb, requireUser, type CurrentUser } from "@/lib/auth";
import { formatDate, formatDateTime } from "@/lib/format";
import { formatRupiah } from "@/lib/programs";
import { withBase } from "@/lib/base-path";
import { waLink } from "@/lib/site";
import { groupByChapter, RECORDING_COUNTS_AS_PRESENT, type Recording } from "@/lib/recordings";
import { MonthCalendar, MonthNav, monthTitle, resolveMonth, timeLabel, type CalendarMonth } from "@/components/month-calendar";

export const metadata: Metadata = { title: "Area belajar", robots: { index: false } };

// Tombol masuk kelas aktif 15 menit sebelum mulai sampai 2 jam setelahnya.
const OPEN_BEFORE_MS = 15 * 60_000;
const OPEN_AFTER_MS = 2 * 3600_000;

// Waktu permintaan; halaman ini selalu dirender per request karena membaca sesi login.
function requestTime() {
  return Date.now();
}

export default async function LearnPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  // Cek login sebelum streaming dimulai, supaya pengunjung tanpa sesi mendapat redirect HTTP biasa.
  const user = await requireUser("/belajar");
  const sp = await searchParams;
  return (
    <div className="mx-auto max-w-4xl px-4 pb-24 pt-10">
      <Suspense fallback={<p className="text-stone-500">Memuat kelas kamu...</p>}>
        <LearnContent user={user} cal={resolveMonth(sp.bulan, requestTime())} meetMissing={sp.meet === "belum"} videoExpired={sp.video === "habis"} />
      </Suspense>
    </div>
  );
}

type Session = {
  id: string;
  number: number;
  starts_at: string;
  kind: string;
  topic: string | null;
  meeting_url: string | null;
  recording_url: string | null;
};

type Enrollment = {
  id: string;
  status: string;
  plan: string;
  batch_id: string;
  access_until: string | null;
  batches: {
    id: string;
    name: string;
    mode: string;
    start_date: string;
    schedule_label: string;
    meeting_url: string | null;
    programs: { id: string; name: string; slug: string };
    teacher: { full_name: string } | null;
    sessions: Session[];
  };
  invoices: StudentInvoice[];
};

async function LearnContent({
  user,
  cal,
  meetMissing,
  videoExpired,
}: {
  user: CurrentUser;
  cal: CalendarMonth;
  meetMissing: boolean;
  videoExpired: boolean;
}) {
  const db = requireDb();

  const { data, error } = await db
    .from("enrollments")
    .select(
      "id, status, plan, batch_id, access_until, batches(id, name, mode, start_date, schedule_label, meeting_url, programs(id, name, slug), teacher:profiles!batches_teacher_id_fkey(full_name), sessions(id, number, starts_at, kind, topic, meeting_url, recording_url)), invoices(code, status, amount, installment_no, due_at, reject_reason, paid_at, payment_proofs(uploaded_at))",
    )
    .eq("profile_id", user.id)
    .neq("status", "keluar")
    .order("created_at", { ascending: false });
  if (error) console.error("Gagal memuat kelas", error.code, error.message);
  const enrollments = (data ?? []) as unknown as Enrollment[];
  const firstName = user.fullName.split(" ")[0];
  const helpHref = waLink(
    `Halo admin Weltgakko, saya ${user.fullName}${
      enrollments.length ? ` (${enrollments.map((e) => `${e.batches.programs.name} ${e.batches.name}`).join(", ")})` : ""
    }. Saya mau tanya: `,
  );
  const invoiceRows = enrollments
    .flatMap((e) => (e.invoices ?? []).map((i) => ({ ...i, label: `${e.batches.programs.name} · ${e.batches.name}` })))
    .sort((a, b) => b.due_at.localeCompare(a.due_at));
  const hasPending = enrollments.some((e) => e.status === "menunggu_bayar");

  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-stone-900">Halo, {firstName}</h1>
          <p className="text-stone-600">Area belajar Weltgakko</p>
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

      {/* Slot banner "Batch dibuka" (P12) dan kartu kelas trial (P7) untuk akun tanpa kelas berbayar. */}

      {!error && enrollments.length === 0 && <EmptyLearnState waHref={helpHref} />}

      {meetMissing && (
        <div className="mt-8">
          <Notice tone="info">Link kelas untuk sesi ini belum diisi sensei. Coba lagi sebentar lagi atau hubungi admin.</Notice>
        </div>
      )}

      {videoExpired && (
        <div className="mt-8">
          <Notice tone="info">Masa akses paket rekaman kamu sudah habis. Hubungi admin untuk memperpanjang.</Notice>
        </div>
      )}

      <ClassCalendar
        enrollments={enrollments.filter((e) => e.status !== "menunggu_bayar" && e.batches.mode !== "rekaman")}
        cal={cal}
      />

      {enrollments.map((e) => (
        <EnrollmentCard key={e.id} enrollment={e} userId={user.id} />
      ))}

      {!error && (enrollments.length === 0 || hasPending) && <TrustPoints />}

      <InvoiceHistory rows={invoiceRows} />

      <HelpButton href={helpHref} />
    </>
  );
}

async function EnrollmentCard({ enrollment: e, userId }: { enrollment: Enrollment; userId: string }) {
  const db = requireDb();
  const batch = e.batches;
  const sessions = [...(batch.sessions ?? [])].sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const openInvoice = (e.invoices ?? []).find((i) => i.status === "belum" || i.status === "ditolak");

  if (e.status === "menunggu_bayar") {
    // Tagihan pertama yang masih relevan: yang sedang berjalan dulu, baru yang kedaluwarsa.
    const first = [...(e.invoices ?? [])]
      .filter((i) => i.installment_no === 1)
      .sort((a, b) => Number(a.status === "kedaluwarsa") - Number(b.status === "kedaluwarsa") || b.due_at.localeCompare(a.due_at))[0];
    return (
      <PendingEnrollment
        programName={batch.programs.name}
        batchName={batch.name}
        startDate={batch.start_date}
        scheduleLabel={batch.schedule_label}
        invoice={first ?? null}
        programSlug={batch.programs.slug}
      />
    );
  }

  if (batch.mode === "rekaman") return <RecordingPackageCard enrollment={e} userId={userId} />;

  const sessionIds = sessions.map((s) => s.id);
  const [materialsRes, attendanceRes, resultsRes] = await Promise.all([
    db
      .from("materials")
      .select("id, title, kind, url, session_id")
      .or(`program_id.eq.${batch.programs.id}${sessionIds.length ? `,session_id.in.(${sessionIds.join(",")})` : ""}`)
      .order("created_at"),
    sessionIds.length
      ? db.from("attendance").select("session_id, via").eq("profile_id", userId).in("session_id", sessionIds)
      : Promise.resolve({ data: [] as { session_id: string; via: string }[] }),
    db.from("exam_results").select("score, exams(title, max_score, session_id)").eq("profile_id", userId),
  ]);

  const now = requestTime();
  const next = sessions.find((s) => new Date(s.starts_at).getTime() + OPEN_AFTER_MS > now);
  const canJoin = next && new Date(next.starts_at).getTime() - OPEN_BEFORE_MS <= now;
  const past = sessions.filter((s) => s.kind === "kelas" && new Date(s.starts_at).getTime() < now);
  const attendance = new Map((attendanceRes.data ?? []).map((a) => [a.session_id, a.via]));
  const attended = new Set(
    [...attendance].filter(([, via]) => via === "live" || RECORDING_COUNTS_AS_PRESENT).map(([id]) => id),
  );
  // Sesi kelas yang sudah lewat, siswa absen, dan rekamannya sudah ada.
  const missedWithRecording = past.filter((s) => s.recording_url && !attendance.has(s.id));
  const attendedPast = past.filter((s) => attended.has(s.id)).length;
  const viaRecording = past.filter((s) => attendance.get(s.id) === "rekaman").length;
  const classes = sessions.filter((s) => s.kind === "kelas");
  const teacher = teacherLabel(batch.teacher?.full_name);
  // Panduan dibuka otomatis sampai kelas pertama lewat.
  const beforeFirstClass = past.length === 0;

  const results = ((resultsRes.data ?? []) as unknown as { score: number; exams: { title: string; max_score: number; session_id: string } }[]).filter(
    (r) => sessionIds.includes(r.exams.session_id),
  );
  const avg = results.length ? results.reduce((sum, r) => sum + (r.score / r.exams.max_score) * 100, 0) / results.length : null;
  // Kesiapan dilihat dari rata-rata 3 tes terakhir, supaya progres terbaru yang terhitung.
  const order = new Map(sessions.map((x, idx) => [x.id, idx]));
  const recent = [...results].sort((a, b) => (order.get(b.exams.session_id) ?? 0) - (order.get(a.exams.session_id) ?? 0)).slice(0, 3);
  const recentAvg = recent.length ? Math.round(recent.reduce((sum, r) => sum + (r.score / r.exams.max_score) * 100, 0) / recent.length) : null;

  return (
    <section className="mt-8 space-y-6">
      <div className="rounded-xl border border-stone-200 bg-white p-6">
        <p className="text-sm text-stone-500">{batch.schedule_label}</p>
        <h2 className="text-xl font-semibold text-stone-900">
          {batch.programs.name} · {batch.name}
        </h2>
        <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-stone-600">
          <span>Mulai {formatDate(batch.start_date)}</span>
          {teacher && <span>· Pengajar: {teacher}</span>}
          <span>· Kelas live lewat Zoom</span>
        </p>

        {next ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-lg bg-stone-50 p-4">
            <div>
              <p className="text-sm text-stone-500">{next.kind === "ujian" ? "Tes kemampuan berikutnya" : "Kelas berikutnya"}</p>
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

        <dl className="mt-4 grid grid-cols-3 gap-2 text-center sm:gap-4">
          <div className="rounded-lg bg-stone-50 px-2 py-3">
            <dt className="text-xs text-stone-500">Pertemuan</dt>
            <dd className="text-lg font-semibold text-stone-900">
              {past.length}
              <span className="text-sm font-normal text-stone-500"> dari {classes.length}</span>
            </dd>
          </div>
          <div className="rounded-lg bg-stone-50 px-2 py-3">
            <dt className="text-xs text-stone-500">Kehadiran</dt>
            <dd className="text-lg font-semibold text-stone-900">
              {past.length ? `${Math.round((attendedPast / past.length) * 100)}%` : "-"}
            </dd>
            {viaRecording > 0 && <dd className="text-xs text-stone-500">{viaRecording} via rekaman</dd>}
          </div>
          <div className="rounded-lg bg-stone-50 px-2 py-3">
            <dt className="text-xs text-stone-500">Rata-rata tes</dt>
            <dd className="text-lg font-semibold text-stone-900">{avg === null ? "-" : Math.round(avg)}</dd>
            {results.length > 0 && <dd className="text-xs text-stone-500">{results.length} tes Jumat</dd>}
          </div>
        </dl>
        {recentAvg !== null && <Readiness avg={recentAvg} level={batch.programs.name} />}
        <p className="mt-2 text-xs text-stone-500">
          Tes Jumat bukan ujian kelulusan, cuma buat lihat sampai mana kemampuanmu. Absen? Tonton rekamannya, tetap dihitung hadir.
        </p>

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
        {missedWithRecording.length > 0 && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-semibold">Kamu absen di {missedWithRecording.length} sesi. Tonton rekamannya sebagai pengganti:</p>
            <ul className="mt-2 space-y-1">
              {missedWithRecording.map((s) => (
                <li key={s.id}>
                  <a href={withBase(`/belajar/rekaman/${s.id}`)} className="font-medium text-red-700 hover:underline">
                    ▶ Kelas {s.number}
                    {s.topic ? ` · ${s.topic}` : ""}
                  </a>{" "}
                  <span className="text-amber-800">({formatDateTime(s.starts_at)})</span>
                </li>
              ))}
            </ul>
            {RECORDING_COUNTS_AS_PRESENT && (
              <p className="mt-2 text-xs text-amber-800">Setelah kamu buka rekamannya, sesi itu tercatat hadir via rekaman.</p>
            )}
          </div>
        )}
      </div>

      <FirstClassGuide open={beforeFirstClass} />

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
          <h3 className="font-semibold text-stone-900">Nilai tes kemampuan</h3>
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

      <VideoLibrary programId={batch.programs.id} userId={userId} collapsible />

      <details className="rounded-xl border border-stone-200 bg-white p-6">
        <summary className="cursor-pointer font-semibold text-stone-900">Jadwal lengkap ({sessions.length} sesi)</summary>
        <ol className="mt-3 space-y-1 text-sm">
          {sessions.map((s) => (
            <li key={s.id} className="flex justify-between border-b border-stone-100 py-1">
              <span>
                {s.number}. {s.kind === "ujian" ? "Tes kemampuan" : "Kelas"}
                {s.topic ? ` · ${s.topic}` : ""}
              </span>
              <span className="text-right text-stone-600">
                {formatDateTime(s.starts_at)}
                {attendance.get(s.id) === "rekaman" ? " · hadir via rekaman" : attendance.has(s.id) ? " · hadir" : ""}
                {s.recording_url && new Date(s.starts_at).getTime() < now && (
                  <>
                    {" · "}
                    <a href={withBase(`/belajar/rekaman/${s.id}`)} className="font-medium text-red-700 hover:underline">
                      Tonton rekaman
                    </a>
                  </>
                )}
              </span>
            </li>
          ))}
        </ol>
      </details>
    </section>
  );
}

type CalendarSession = Session & { batchName: string; programName: string; hasLink: boolean };

// Kalender pribadi siswa: semua sesi dari batch yang dia ikuti, plus daftar kelas berikutnya.
function ClassCalendar({ enrollments, cal }: { enrollments: Enrollment[]; cal: CalendarMonth }) {
  if (enrollments.length === 0) return null;
  const now = requestTime();
  const all: CalendarSession[] = enrollments
    .flatMap((e) =>
      (e.batches.sessions ?? []).map((s) => ({
        ...s,
        batchName: e.batches.name,
        programName: e.batches.programs.name,
        hasLink: Boolean(s.meeting_url || e.batches.meeting_url),
      })),
    )
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const inMonth = all.filter((s) => {
    const t = new Date(s.starts_at).getTime();
    return t >= cal.start && t < cal.end;
  });
  const upcoming = all.filter((s) => new Date(s.starts_at).getTime() + OPEN_AFTER_MS > now).slice(0, 3);

  const isOpen = (s: CalendarSession) => {
    const t = new Date(s.starts_at).getTime();
    return t - OPEN_BEFORE_MS <= now && now < t + OPEN_AFTER_MS;
  };
  const label = (s: CalendarSession) => `${s.kind === "ujian" ? "Tes kemampuan" : `Kelas ${s.number}`}${s.topic ? ` · ${s.topic}` : ""}`;
  const joinButton = (s: CalendarSession, small = false) =>
    new Date(s.starts_at).getTime() + OPEN_AFTER_MS <= now ? (
      s.recording_url ? (
        <a href={withBase(`/belajar/rekaman/${s.id}`)} className="text-xs font-semibold text-red-700 hover:underline">
          ▶ Tonton rekaman
        </a>
      ) : (
        <span className="text-xs text-stone-500">Selesai</span>
      )
    ) : !s.hasLink ? (
      <span className="text-xs text-stone-500">Link kelas belum diisi sensei</span>
    ) : isOpen(s) ? (
      <a
        href={withBase(`/belajar/masuk/${s.id}`)}
        className={`rounded-lg bg-red-700 font-semibold text-white hover:bg-red-800 ${small ? "px-3 py-1 text-xs" : "px-4 py-2 text-sm"}`}
      >
        Masuk kelas
      </a>
    ) : (
      <span className="text-xs text-stone-500">Link siap, tombol aktif 15 menit sebelum mulai</span>
    );

  return (
    <section className="mt-8 space-y-6">
      <div className="rounded-xl border border-stone-200 bg-white p-6">
        <h2 className="text-xl font-semibold text-stone-900">Kelas berikutnya</h2>
        {upcoming.length === 0 ? (
          <p className="mt-2 text-sm text-stone-500">Belum ada jadwal kelas berikutnya.</p>
        ) : (
          <ul className="mt-3 divide-y divide-stone-100">
            {upcoming.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-semibold text-stone-900">
                    {formatDateTime(s.starts_at)} WIB
                  </p>
                  <p className="text-sm text-stone-600">
                    {s.programName} · {label(s)}
                  </p>
                </div>
                {joinButton(s)}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div id="kalender" className="scroll-mt-20 rounded-xl border border-stone-200 bg-white p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-stone-900">Kalender kelas · {monthTitle(cal)}</h2>
          <MonthNav
            cal={cal}
            path="/belajar"
            buttonClass="rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50"
          />
        </div>
        <MonthCalendar
          cal={cal}
          items={inMonth}
          renderItem={(s) => (
            <p
              title={`${s.programName} · ${s.batchName} · ${label(s)}`}
              className={`flex items-center gap-1.5 truncate rounded px-1 py-0.5 text-xs ${s.kind === "ujian" ? "bg-amber-50 text-amber-900" : "bg-red-50 text-red-900"}`}
            >
              <span className="tabular-nums">{timeLabel(s.starts_at)}</span>
              <span className="truncate">{label(s)}</span>
            </p>
          )}
          renderMobileItem={(s) => (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-stone-50 px-3 py-2">
              <div className="text-sm">
                <span className="font-semibold tabular-nums text-stone-900">{timeLabel(s.starts_at)} WIB</span>{" "}
                <span className="text-stone-700">· {label(s)}</span>
                <p className="text-xs text-stone-500">{s.programName}</p>
              </div>
              {joinButton(s, true)}
            </div>
          )}
        />
      </div>
    </section>
  );
}

// Paket rekaman: tanpa jadwal, cukup pustaka video dan masa akses.
async function RecordingPackageCard({ enrollment: e, userId }: { enrollment: Enrollment; userId: string }) {
  const now = requestTime();
  const expired = e.access_until ? new Date(e.access_until).getTime() <= now : false;
  return (
    <section className="mt-8 space-y-6">
      <div className="rounded-xl border border-stone-200 bg-white p-6">
        <p className="text-sm font-medium text-red-700">Paket rekaman video</p>
        <h2 className="text-xl font-semibold text-stone-900">{e.batches.programs.name}</h2>
        <p className="mt-1 text-sm text-stone-600">
          {e.access_until
            ? expired
              ? `Masa akses berakhir ${formatDate(e.access_until)}. Hubungi admin untuk memperpanjang.`
              : `Belajar kapan saja sampai ${formatDate(e.access_until)}.`
            : "Belajar kapan saja."}
        </p>
      </div>
      {!expired && <VideoLibrary programId={e.batches.programs.id} userId={userId} />}
    </section>
  );
}

// Pustaka video program per bab, dengan tanda video yang sudah dibuka.
async function VideoLibrary({ programId, userId, collapsible = false }: { programId: string; userId: string; collapsible?: boolean }) {
  const db = requireDb();
  const { data } = await db.from("recordings").select("id, chapter, title, url, position").eq("program_id", programId);
  const videos = (data ?? []) as Recording[];
  if (collapsible && videos.length === 0) return null;
  const { data: views } = videos.length
    ? await db.from("recording_views").select("recording_id").eq("profile_id", userId).in("recording_id", videos.map((v) => v.id))
    : { data: [] as { recording_id: string }[] };
  const watched = new Set((views ?? []).map((v) => v.recording_id));
  const pct = videos.length ? Math.round((watched.size / videos.length) * 100) : 0;

  const body = (
    <>
      {videos.length === 0 ? (
        <p className="mt-2 text-sm text-stone-500">Video akan muncul di sini setelah diunggah pengajar.</p>
      ) : (
        <>
          <div className="mt-3 flex items-center gap-3 text-sm text-stone-600">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-stone-100">
              <div className="h-full rounded-full bg-red-700" style={{ width: `${pct}%` }} />
            </div>
            <span className="tabular-nums">
              {watched.size}/{videos.length} ditonton
            </span>
          </div>
          <div className="mt-4 space-y-4">
            {groupByChapter(videos).map(([chapter, items]) => (
              <div key={chapter}>
                <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Bab {chapter}</p>
                <ul className="mt-1 divide-y divide-stone-100">
                  {items.map((v) => (
                    <li key={v.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                      <span className={watched.has(v.id) ? "text-stone-500" : "text-stone-900"}>
                        {watched.has(v.id) ? "✓ " : ""}
                        {v.title}
                      </span>
                      <a
                        href={withBase(`/belajar/video/${v.id}`)}
                        target="_blank"
                        rel="noreferrer"
                        className="shrink-0 rounded-lg bg-red-700 px-3 py-1 text-xs font-semibold text-white hover:bg-red-800"
                      >
                        ▶ Tonton
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );

  return collapsible ? (
    <details className="rounded-xl border border-stone-200 bg-white p-6">
      <summary className="cursor-pointer font-semibold text-stone-900">Video rekaman materi ({videos.length})</summary>
      {body}
    </details>
  ) : (
    <div className="rounded-xl border border-stone-200 bg-white p-6">
      <h3 className="font-semibold text-stone-900">Video materi</h3>
      {body}
    </div>
  );
}

// Perkiraan kesiapan ikut ujian resmi dari rata-rata tes Jumat. Hanya panduan.
function Readiness({ avg, level }: { avg: number; level: string }) {
  const [tone, text] =
    avg >= 80
      ? ["bg-emerald-50 text-emerald-900", `Kemampuanmu sudah bagus. Kamu siap mencoba ujian ${level} resmi.`]
      : avg >= 60
        ? ["bg-sky-50 text-sky-900", `Hampir siap untuk ujian ${level}. Ulangi bagian yang masih salah di tes Jumat.`]
        : ["bg-amber-50 text-amber-900", "Masih perlu latihan. Tonton lagi rekaman dan materinya, pelan-pelan saja."];
  return <p className={`mt-3 rounded-lg px-3 py-2 text-sm ${tone}`}>{text}</p>;
}
