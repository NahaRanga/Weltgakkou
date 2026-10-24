import Link from "next/link";
import { CreateQuizForm, TrialToggle } from "@/components/admin/latihan-forms";
import { Badge, Card, Empty, PageTitle, WaLink, tableClass, tdClass, thClass } from "@/components/admin/ui";
import { requireAdmin, requireDb } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { kindLabels, percent, type Quiz } from "@/lib/quiz";

export const metadata = { title: "Latihan gratis" };

type AttemptRow = {
  id: string;
  score: number | null;
  total: number | null;
  submitted_at: string;
  quizzes: { title: string };
  profiles: {
    id: string;
    full_name: string;
    email: string | null;
    whatsapp: string | null;
    learning_goal: string | null;
    prior_level: string | null;
    ssw_field: string | null;
    been_to_japan: boolean | null;
    trial_attended_at: string | null;
  };
};

export default async function PracticeAdminPage() {
  await requireAdmin();
  const db = requireDb();
  const [quizRes, attemptRes] = await Promise.all([
    db.from("quizzes").select("id, slug, kind, title, duration_minutes, published, position, quiz_questions(count), quiz_attempts(count)").order("position"),
    db
      .from("quiz_attempts")
      .select("id, score, total, submitted_at, quizzes(title), profiles(id, full_name, email, whatsapp, learning_goal, prior_level, ssw_field, been_to_japan, trial_attended_at)")
      .not("submitted_at", "is", null)
      .order("submitted_at", { ascending: false })
      .limit(200),
  ]);
  const quizzes = (quizRes.data ?? []) as unknown as (Quiz & { quiz_questions: { count: number }[]; quiz_attempts: { count: number }[] })[];
  const attempts = (attemptRes.data ?? []) as unknown as AttemptRow[];

  return (
    <>
      <PageTitle
        title="Latihan gratis"
        subtitle="Tes penempatan dan mini tryout di /latihan. Pengunjung wajib buat akun (nama, WhatsApp, email) sebelum mengerjakan, jadi daftar di bawah ini bahan follow-up."
      />

      <div className="space-y-6">
        <Card title="Tes" count={quizzes.length}>
          {quizzes.length === 0 ? (
            <Empty>Belum ada tes. Jalankan migrasi 0005_latihan.sql atau buat tes baru di bawah.</Empty>
          ) : (
            <div className="overflow-x-auto">
              <table className={tableClass}>
                <thead>
                  <tr>
                    <th className={thClass}>Tes</th>
                    <th className={thClass}>Jenis</th>
                    <th className={thClass}>Soal</th>
                    <th className={thClass}>Dikerjakan</th>
                    <th className={thClass}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {quizzes.map((q) => (
                    <tr key={q.id} className="border-t border-stone-100">
                      <td className={tdClass}>
                        <Link href={`/admin/latihan/${q.id}`} className="font-medium text-stone-900 hover:underline">
                          {q.title}
                        </Link>
                        <p className="text-xs text-stone-500">
                          {q.duration_minutes} menit · /latihan · {q.slug}
                        </p>
                      </td>
                      <td className={tdClass}>{kindLabels[q.kind]}</td>
                      <td className={tdClass}>{q.quiz_questions[0]?.count ?? 0}</td>
                      <td className={tdClass}>{q.quiz_attempts[0]?.count ?? 0}×</td>
                      <td className={tdClass}>
                        <Badge value={q.published ? "tampil" : "disembunyikan"} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card title="Peserta latihan" count={attempts.length}>
          {attempts.length === 0 ? (
            <Empty>Belum ada yang mengerjakan tes.</Empty>
          ) : (
            <div className="overflow-x-auto">
              <table className={tableClass}>
                <thead>
                  <tr>
                    <th className={thClass}>Nama</th>
                    <th className={thClass}>Tes</th>
                    <th className={thClass}>Skor</th>
                    <th className={thClass}>Jawaban awal</th>
                    <th className={thClass}>Trial</th>
                  </tr>
                </thead>
                <tbody>
                  {attempts.map((a) => {
                    const p = a.profiles;
                    const pct = percent(a.score, a.total);
                    return (
                      <tr key={a.id} className="border-t border-stone-100">
                        <td className={tdClass}>
                          <Link href={`/admin/siswa/${p.id}`} className="font-medium text-stone-900 hover:underline">
                            {p.full_name}
                          </Link>
                          <p className="text-xs text-stone-500">{p.email}</p>
                          <WaLink number={p.whatsapp} text={`Halo ${p.full_name.split(" ")[0]}, ini admin Weltgakko. Terima kasih sudah mencoba ${a.quizzes.title}, skormu ${pct}%. Mau kami bantu pilih kelas yang pas?`} />
                        </td>
                        <td className={tdClass}>
                          {a.quizzes.title}
                          <p className="text-xs text-stone-500">{formatDate(a.submitted_at)}</p>
                        </td>
                        <td className={tdClass}>
                          <Link href={`/latihan/hasil/${a.id}`} className="font-semibold text-red-700 hover:underline">
                            {pct}%
                          </Link>
                          <p className="text-xs text-stone-500">
                            {a.score}/{a.total}
                          </p>
                        </td>
                        <td className={`${tdClass} text-xs text-stone-600`}>
                          {[p.learning_goal, p.prior_level, p.ssw_field && `SSW: ${p.ssw_field}`, p.been_to_japan === null ? null : p.been_to_japan ? "Pernah ke Jepang" : "Belum ke Jepang"]
                            .filter(Boolean)
                            .join(" · ") || "-"}
                        </td>
                        <td className={tdClass}>
                          <TrialToggle profileId={p.id} attended={Boolean(p.trial_attended_at)} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card title="Buat tes baru">
          <CreateQuizForm />
        </Card>
      </div>
    </>
  );
}
