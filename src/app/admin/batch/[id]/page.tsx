import Link from "next/link";
import { notFound } from "next/navigation";
import {
  deleteMaterial,
  saveAttendance,
  saveExamScores,
  setBatchStatus,
  updateSession,
} from "@/app/admin/batch/actions";
import { setEnrollmentStatus } from "@/app/admin/siswa/actions";
import {
  BatchEditForm,
  MeetingLinkForm,
  InstallmentButton,
  MaterialForm,
} from "@/components/admin-controls";
import {
  Badge,
  Card,
  Empty,
  PageTitle,
  smallButton,
  Stat,
  tableClass,
  tdClass,
  thClass,
  WaLink,
} from "@/components/admin/ui";
import {
  ParticipantDetails,
  type ParticipantProfile,
} from "@/components/admin/participant";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { inputClass } from "@/components/ui/form";
import { requireDb, requireStaff } from "@/lib/auth";
import { withBase } from "@/lib/base-path";
import { formatDate, formatDateTime, requestTime, siteUrl } from "@/lib/format";

export const metadata = { title: "Detail batch" };

type Enrollment = {
  id: string;
  status: string;
  plan: string;
  profile_id: string;
  profiles: ParticipantProfile;
  invoices: { installment_no: number; status: string }[];
};

type Batch = {
  id: string;
  name: string;
  status: "buka" | "berjalan" | "selesai";
  start_date: string;
  quota: number;
  schedule_label: string;
  meeting_url: string | null;
  mode: string;
  teacher_id: string | null;
  is_trial?: boolean;
  registration_deadline?: string | null;
  programs: { id: string; name: string; months: number | null };
  enrollments: Enrollment[];
  sessions: {
    id: string;
    number: number;
    starts_at: string;
    kind: string;
    topic: string | null;
    meeting_url: string | null;
    recording_url: string | null;
  }[];
};

export default async function BatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const user = await requireStaff();
  const isAdmin = user.role === "admin";
  const db = requireDb();

  const { data } = await db
    .from("batches")
    .select(
      // "*" supaya kolom baru (is_trial, registration_deadline) ikut bila migrasinya sudah jalan.
      "*, programs(id, name, months), sessions(id, number, starts_at, kind, topic, meeting_url, recording_url), enrollments(id, status, plan, profile_id, profiles(full_name, whatsapp, email, nickname, gender, birth_place_date, domicile, address, education, occupation, tiktok, instagram, studied_before, prior_level, learning_goal), invoices(installment_no, status))",
    )
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();
  const batch = data as unknown as Batch;
  // Pengajar hanya bisa membuka batch yang ia ajar.
  if (!isAdmin && batch.teacher_id !== user.id) notFound();
  const sessions = [...batch.sessions].sort((a, b) =>
    a.starts_at.localeCompare(b.starts_at),
  );
  const sessionIds = sessions.map((s) => s.id);
  const enrollments = batch.enrollments
    .filter((e) => e.status !== "keluar")
    .sort((a, b) => a.profiles.full_name.localeCompare(b.profiles.full_name));
  const students = enrollments.filter(
    (e) => e.status === "aktif" || e.status === "selesai",
  );
  const studentIds = students.map((e) => e.profile_id);

  const empty = Promise.resolve({ data: [] as never[] });
  const [attendanceRes, examsRes, materialsRes, teachersRes] =
    await Promise.all([
      sessionIds.length
        ? db
            .from("attendance")
            .select("session_id, profile_id, via")
            .in("session_id", sessionIds)
        : empty,
      sessionIds.length
        ? db
            .from("exams")
            .select(
              "id, session_id, max_score, exam_results(profile_id, score)",
            )
            .in("session_id", sessionIds)
        : empty,
      db
        .from("materials")
        .select("id, title, kind, url, session_id")
        .or(
          `program_id.eq.${batch.programs.id}${sessionIds.length ? `,session_id.in.(${sessionIds.join(",")})` : ""}`,
        )
        .order("created_at"),
      db
        .from("profiles")
        .select("id, full_name")
        .in("role", ["pengajar", "admin"])
        .order("full_name"),
    ]);

  const attendance = (attendanceRes.data ?? []) as {
    session_id: string;
    profile_id: string;
    via: string;
  }[];
  const viaRecording = new Set(
    attendance
      .filter((a) => a.via === "rekaman")
      .map((a) => `${a.session_id}:${a.profile_id}`),
  );
  const present = new Set(
    attendance.map((a) => `${a.session_id}:${a.profile_id}`),
  );
  const exams = (examsRes.data ?? []) as {
    id: string;
    session_id: string;
    max_score: number;
    exam_results: { profile_id: string; score: number }[];
  }[];
  const examBySession = new Map(exams.map((e) => [e.session_id, e]));
  const materials = (materialsRes.data ?? []) as {
    id: string;
    title: string;
    kind: string;
    url: string;
    session_id: string | null;
  }[];

  const now = requestTime();
  const past = sessions.filter((s) => new Date(s.starts_at).getTime() < now);
  const pastIds = new Set(past.map((s) => s.id));
  const attendanceRate = (profileId: string) => {
    if (!past.length) return null;
    const count = attendance.filter(
      (a) => a.profile_id === profileId && pastIds.has(a.session_id),
    ).length;
    return Math.round((count / past.length) * 100);
  };
  const examAverage = (profileId: string) => {
    const scores = exams.flatMap((e) =>
      e.exam_results
        .filter((r) => r.profile_id === profileId)
        .map((r) => (Number(r.score) / e.max_score) * 100),
    );
    return scores.length
      ? Math.round(scores.reduce((s, x) => s + x, 0) / scores.length)
      : null;
  };
  const sessionLabel = (s: {
    number: number;
    kind: string;
    topic: string | null;
  }) =>
    `${s.number}. ${s.kind === "ujian" ? "Ujian" : "Kelas"}${s.topic ? ` · ${s.topic}` : ""}`;
  const nextSession = sessions.find(
    (s) => new Date(s.starts_at).getTime() + 2 * 3600_000 > now,
  );
  const nextIndex = nextSession
    ? sessions.indexOf(nextSession)
    : sessions.length;
  const windowStart = Math.max(0, nextIndex - 3);
  const windowEnd = Math.min(sessions.length, nextIndex + 6);
  const active = enrollments.filter((e) => e.status === "aktif").length;
  const waiting = enrollments.filter(
    (e) => e.status === "menunggu_bayar",
  ).length;
  const registerUrl = `${siteUrl()}/daftar/${batch.id}`;

  return (
    <>
      <Link
        href="/admin/batch"
        className="text-sm text-stone-600 hover:underline"
      >
        ← {isAdmin ? "Semua batch" : "Kelas saya"}
      </Link>
      <PageTitle
        title={`${batch.programs.name} · ${batch.name}`}
        subtitle={`Mulai ${formatDate(batch.start_date)} · ${batch.schedule_label}`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Badge value={batch.status} />
            {isAdmin &&
              (["buka", "berjalan", "selesai"] as const)
              .filter((s) => s !== batch.status)
              .map((s) => (
                <form key={s} action={setBatchStatus.bind(null, batch.id, s)}>
                  <ConfirmButton
                    className={smallButton}
                    danger={s === "selesai"}
                    title={`Tandai batch "${batch.name}" ${s}?`}
                    message={
                      s === "selesai"
                        ? "Batch dianggap sudah tamat. Pastikan semua pertemuan memang sudah selesai."
                        : s === "buka"
                          ? "Batch akan tampil lagi di situs dan bisa didaftar calon siswa."
                          : "Pendaftaran batch ini ditutup dan kelas dianggap sedang berjalan."
                    }
                    confirmLabel={`Ya, tandai ${s}`}
                  >
                    Tandai {s}
                  </ConfirmButton>
                </form>
              ))}
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat
          label="Siswa aktif"
          value={`${active}/${batch.quota}`}
          hint={waiting ? `${waiting} menunggu bayar` : undefined}
        />
        <Stat
          label="Sesi berjalan"
          value={`${past.length}/${sessions.length}`}
        />
        <Stat
          label="Sesi berikutnya"
          value={nextSession ? `#${nextSession.number}` : "-"}
          hint={
            nextSession
              ? formatDateTime(nextSession.starts_at)
              : "Semua sesi selesai"
          }
        />
        <Stat label="Materi" value={materials.length} />
      </div>

      {batch.mode === "live" && (
      <Card title="Link kelas (Zoom/Meet)" className="mt-6">
        <MeetingLinkForm batchId={batch.id} meetingUrl={batch.meeting_url} />
        <p className="mt-2 text-xs text-stone-500">
          Dipakai semua sesi batch ini. Siswa tidak melihat linknya langsung,
          mereka masuk lewat tombol Masuk kelas (aktif 15 menit sebelum mulai)
          dan kehadirannya tercatat otomatis. Kalau satu sesi butuh link lain,
          isi di bagian sesi di bawah.
        </p>
      </Card>
      )}

      {isAdmin && (
      <Card title="Link pendaftaran" className="mt-6">
        <p className="break-all font-mono text-sm text-stone-800">
          {registerUrl}
        </p>
        <p className="mt-2 text-xs text-stone-500">
          Bagikan link ini ke calon siswa (misalnya di WhatsApp atau bio
          TikTok). Link hanya menerima pendaftar selama batch berstatus buka.
        </p>
        <a
          href={withBase(`/daftar/${batch.id}`)}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-block text-sm font-medium text-red-700 hover:underline"
        >
          Buka halaman pendaftaran
        </a>
      </Card>
      )}

      <Card title="Siswa" count={enrollments.length} className="mt-6">
        {enrollments.length === 0 ? (
          <Empty>Belum ada pendaftar di batch ini.</Empty>
        ) : (
          <div className="-mx-5 overflow-x-auto">
            <table className={tableClass}>
              <thead className="bg-stone-50">
                <tr>
                  <th className={thClass}>Nama</th>
                  <th className={thClass}>Status</th>
                  {isAdmin && <th className={thClass}>Bayar</th>}
                  <th className={thClass}>Hadir</th>
                  <th className={thClass}>Nilai</th>
                  {isAdmin && <th className={thClass}></th>}
                </tr>
              </thead>
              <tbody>
                {enrollments.map((e) => {
                  const paid = e.invoices.filter(
                    (i) => i.status === "lunas",
                  ).length;
                  const rate = attendanceRate(e.profile_id);
                  const avg = examAverage(e.profile_id);
                  return (
                    <tr key={e.id} className="border-t border-stone-100">
                      <td className={tdClass}>
                        {isAdmin ? (
                          <Link
                            href={`/admin/siswa/${e.profile_id}`}
                            className="font-medium text-stone-900 hover:underline"
                          >
                            {e.profiles.full_name}
                          </Link>
                        ) : (
                          <span className="font-medium text-stone-900">{e.profiles.full_name}</span>
                        )}{" "}
                        <WaLink number={e.profiles.whatsapp} />
                        <ParticipantDetails p={e.profiles} />
                      </td>
                      <td className={tdClass}>
                        <Badge value={e.status} />
                      </td>
                      {isAdmin && (
                      <td className={`${tdClass} whitespace-nowrap`}>
                        {e.plan === "bulanan"
                          ? `${paid}/${batch.programs.months ?? "?"} bulan`
                          : paid
                            ? "Lunas"
                            : "-"}
                        {e.plan === "bulanan" && e.status === "aktif" && (
                          <span className="block">
                            <InstallmentButton enrollmentId={e.id} />
                          </span>
                        )}
                      </td>
                      )}
                      <td className={tdClass}>
                        {rate === null ? (
                          "-"
                        ) : (
                          <span>
                            {rate}%
                          </span>
                        )}
                      </td>
                      <td className={tdClass}>
                        {avg === null ? (
                          "-"
                        ) : (
                          <span>
                            {avg}
                          </span>
                        )}
                      </td>
                      {isAdmin && (
                      <td className={tdClass}>
                        <div className="flex flex-wrap gap-1">
                          {e.status === "aktif" && (
                            <form
                              action={setEnrollmentStatus.bind(
                                null,
                                e.id,
                                "selesai",
                              )}
                            >
                              <ConfirmButton
                                className="text-xs text-stone-600 hover:underline"
                                danger={false}
                                title={`Tandai ${e.profiles.full_name} lulus/selesai?`}
                                message={`Siswa ini dianggap sudah menyelesaikan ${batch.name}.`}
                                confirmLabel="Ya, tandai selesai"
                              >
                                Lulus/selesai
                              </ConfirmButton>
                            </form>
                          )}
                          {e.status === "selesai" && (
                            <form
                              action={setEnrollmentStatus.bind(
                                null,
                                e.id,
                                "aktif",
                              )}
                            >
                              <button className="text-xs text-stone-600 hover:underline">
                                Aktifkan lagi
                              </button>
                            </form>
                          )}
                          <form
                            action={setEnrollmentStatus.bind(
                              null,
                              e.id,
                              "keluar",
                            )}
                          >
                            <ConfirmButton
                              className="text-xs text-red-700 hover:underline"
                              title={`Keluarkan ${e.profiles.full_name}?`}
                              message={
                                <>
                                  <span className="font-semibold">{e.profiles.full_name}</span> akan dikeluarkan dari{" "}
                                  <span className="font-semibold">{batch.programs.name} · {batch.name}</span> dan tidak bisa masuk kelas lagi.
                                  Refund (bila ada) tetap diurus manual.
                                </>
                              }
                              confirmLabel="Ya, keluarkan"
                            >
                              Keluarkan
                            </ConfirmButton>
                          </form>
                        </div>
                      </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-3 text-xs text-stone-500">
          Nilai = rata-rata tes kemampuan Jumat, hanya untuk melihat progres
          siswa. Kehadiran juga hanya info; nonton rekaman dihitung hadir.
        </p>
      </Card>

      <Card
        title="Jadwal, absensi, dan nilai"
        count={sessions.length}
        className="mt-6"
      >
        <p className="mb-3 text-sm text-stone-600">
          Kehadiran tercatat otomatis saat siswa menekan tombol Masuk kelas.
          Centang manual di sini untuk siswa yang masuk lewat cara lain.
        </p>
        {sessions.length === 0 ? (
          <Empty>Batch ini belum punya jadwal.</Empty>
        ) : (
          <div className="group">
            {/* Jadwal panjang diringkas: tampil sesi di sekitar sesi berikutnya, sisanya lewat centang. */}
            <div className="divide-y divide-stone-100">
              {sessions.map((s, index) => {
                const hidden = index < windowStart || index >= windowEnd;
                const isPast = pastIds.has(s.id);
                const count = students.filter((e) =>
                  present.has(`${s.id}:${e.profile_id}`),
                ).length;
                const exam = examBySession.get(s.id);
                return (
                  <details
                    key={s.id}
                    id={`sesi-${s.id}`}
                    className={`scroll-mt-6 py-2 ${hidden ? "hidden group-has-[#semua-sesi:checked]:block" : ""}`}
                    open={s.id === nextSession?.id}
                  >
                    <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 text-sm">
                      <span>
                        <span
                          className={`font-medium ${isPast ? "text-stone-500" : "text-stone-900"}`}
                        >
                          {sessionLabel(s)}
                        </span>
                        <span className="ml-2 text-stone-500">
                          {formatDateTime(s.starts_at)}
                        </span>
                      </span>
                      <span className="text-xs text-stone-500">
                        {isPast || count
                          ? `${count}/${students.length} hadir`
                          : "Belum mulai"}
                        {s.kind === "ujian" && exam
                          ? ` · ${exam.exam_results.length} nilai`
                          : ""}
                      </span>
                    </summary>
                    <div className="mt-3 grid gap-4 pb-2 md:grid-cols-2">
                      <form
                        action={updateSession.bind(null, s.id)}
                        className="space-y-2"
                      >
                        <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                          Topik sesi
                        </p>
                        <input
                          name="topic"
                          defaultValue={s.topic ?? ""}
                          placeholder="Contoh: Bab 3, kata kerja"
                          className={`${inputClass} text-sm`}
                        />
                        <input
                          name="meeting_url"
                          defaultValue={s.meeting_url ?? ""}
                          placeholder="Link Zoom/Meet khusus sesi ini (opsional)"
                          className={`${inputClass} text-sm`}
                        />
                        <input
                          name="recording_url"
                          defaultValue={s.recording_url ?? ""}
                          placeholder="Link rekaman kelas (isi setelah kelas)"
                          className={`${inputClass} text-sm`}
                        />
                        <button className={smallButton}>Simpan sesi</button>
                      </form>
                      {students.length > 0 && (
                        <form
                          action={saveAttendance.bind(null, s.id, studentIds)}
                          className="space-y-2"
                        >
                          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                            Absensi
                          </p>
                          <div className="grid gap-1 sm:grid-cols-2">
                            {students.map((e) => (
                              <label
                                key={e.profile_id}
                                className="flex items-center gap-2 text-sm"
                              >
                                <input
                                  type="checkbox"
                                  name="present"
                                  value={e.profile_id}
                                  defaultChecked={present.has(
                                    `${s.id}:${e.profile_id}`,
                                  )}
                                />
                                {e.profiles.full_name}
                                {viaRecording.has(`${s.id}:${e.profile_id}`) && (
                                  <span className="text-xs text-amber-700">
                                    via rekaman
                                  </span>
                                )}
                              </label>
                            ))}
                          </div>
                          <button className={smallButton}>
                            Simpan absensi
                          </button>
                        </form>
                      )}
                      {s.kind === "ujian" && students.length > 0 && (
                        <form
                          action={saveExamScores.bind(null, s.id)}
                          className="space-y-2 md:col-span-2"
                        >
                          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                            Nilai tes kemampuan
                          </p>
                          <label className="flex items-center gap-2 text-sm">
                            Nilai maksimal
                            <input
                              name="max_score"
                              type="number"
                              min={1}
                              defaultValue={exam?.max_score ?? 100}
                              className={`${inputClass} w-24 py-1 text-sm`}
                            />
                          </label>
                          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                            {students.map((e) => (
                              <label
                                key={e.profile_id}
                                className="flex items-center justify-between gap-2 text-sm"
                              >
                                <span className="truncate">
                                  {e.profiles.full_name}
                                </span>
                                <input
                                  name={`score_${e.profile_id}`}
                                  inputMode="decimal"
                                  defaultValue={
                                    exam?.exam_results.find(
                                      (r) => r.profile_id === e.profile_id,
                                    )?.score ?? ""
                                  }
                                  className={`${inputClass} w-20 py-1 text-sm`}
                                />
                              </label>
                            ))}
                          </div>
                          <button className={smallButton}>Simpan nilai</button>
                        </form>
                      )}
                    </div>
                  </details>
                );
              })}
            </div>
            {sessions.length > windowEnd - windowStart && (
              <label className="mt-3 inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-red-700">
                <input
                  id="semua-sesi"
                  type="checkbox"
                  className="accent-red-700"
                />
                Tampilkan semua {sessions.length} sesi
              </label>
            )}
          </div>
        )}
      </Card>

      <Card title="Materi" count={materials.length} className="mt-6">
        {materials.length > 0 && (
          <ul className="mb-5 divide-y divide-stone-100">
            {materials.map((m) => {
              const session = sessions.find((s) => s.id === m.session_id);
              return (
                <li
                  key={m.id}
                  className="flex items-center justify-between gap-3 py-2 text-sm"
                >
                  <span>
                    <a
                      href={m.url}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-red-700 hover:underline"
                    >
                      {m.title}
                    </a>{" "}
                    <span className="text-xs text-stone-500">
                      {m.kind} ·{" "}
                      {session
                        ? `sesi ${session.number}`
                        : `semua batch ${batch.programs.name}`}
                    </span>
                  </span>
                  {(isAdmin || session) && (
                  <form action={deleteMaterial.bind(null, m.id)}>
                    <ConfirmButton
                      className="text-xs text-stone-500 hover:text-red-700"
                      title="Hapus materi ini?"
                      message={`"${m.title}" akan dihapus dan tidak bisa dibuka siswa lagi.`}
                      confirmLabel="Ya, hapus"
                    >
                      Hapus
                    </ConfirmButton>
                  </form>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        <MaterialForm
          batchId={batch.id}
          allowProgramWide={isAdmin}
          sessions={sessions.map((s) => ({
            id: s.id,
            label: `${sessionLabel(s)} (${formatDate(s.starts_at)})`,
          }))}
        />
      </Card>

      {isAdmin && (
        <Card title="Pengaturan batch" className="mt-6">
          <BatchEditForm batch={batch} teachers={teachersRes.data ?? []} />
        </Card>
      )}
    </>
  );
}
