import Link from "next/link";
import { RecordingForm, RecordingPackageForm } from "@/components/admin-controls";
import { Badge, Card, Empty, PageTitle } from "@/components/admin/ui";
import { deleteRecording } from "@/app/admin/rekaman/actions";
import { requireDb, requireStaff } from "@/lib/auth";
import { formatRupiah } from "@/lib/programs";
import { groupByChapter, type Recording } from "@/lib/recordings";
import { ConfirmButton } from "@/components/admin/confirm-button";

export const metadata = { title: "Video rekaman" };

type Program = {
  id: string;
  name: string;
  upfront_price: number | null;
  recording_price: number | null;
  recording_months: number;
};

export default async function RecordingsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireStaff();
  const isAdmin = user.role === "admin";
  const sp = await searchParams;
  const db = requireDb();

  let programs = ((await db.from("programs").select("id, name, upfront_price, recording_price, recording_months").eq("active", true).order("created_at")).data ?? []) as Program[];
  if (!isAdmin) {
    const { data } = await db.from("batches").select("program_id").eq("teacher_id", user.id);
    const mine = new Set((data ?? []).map((b) => b.program_id));
    programs = programs.filter((p) => mine.has(p.id));
  }
  if (programs.length === 0) {
    return (
      <>
        <PageTitle title="Video rekaman" />
        <Empty>Belum ada program yang kamu ajar.</Empty>
      </>
    );
  }
  const current = programs.find((p) => p.id === sp.program) ?? programs[0];

  const [videosRes, packageRes] = await Promise.all([
    db.from("recordings").select("id, chapter, title, url, position").eq("program_id", current.id),
    db.from("batches").select("id, status, enrollments(status)").eq("program_id", current.id).eq("mode", "rekaman").maybeSingle(),
  ]);
  const videos = (videosRes.data ?? []) as Recording[];
  const chapters = groupByChapter(videos);
  const pkg = packageRes.data as { id: string; status: string; enrollments: { status: string }[] } | null;
  const buyers = pkg?.enrollments.filter((e) => e.status === "aktif" || e.status === "selesai").length ?? 0;
  const open = pkg?.status === "buka";

  return (
    <>
      <PageTitle
        title="Video rekaman"
        subtitle="Video materi per bab untuk paket rekaman dan bahan ulang siswa kelas live. Rekaman tiap sesi kelas diisi di halaman batch."
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {programs.map((p) => (
          <Link
            key={p.id}
            href={`/admin/rekaman?program=${p.id}`}
            className={`rounded-full px-3 py-1 text-sm ${p.id === current.id ? "bg-red-700 text-white" : "bg-white text-stone-700 ring-1 ring-stone-200 hover:bg-stone-50"}`}
          >
            {p.name}
          </Link>
        ))}
      </div>

      {isAdmin && (
        <Card
          title="Paket rekaman"
          action={<Badge value={open ? "dijual" : "belum_dijual"} />}
          className="mb-6"
        >
          <RecordingPackageForm programId={current.id} price={current.recording_price} months={current.recording_months} open={open} />
          <p className="mt-3 text-xs text-stone-500">
            {current.upfront_price ? `Kelas live sekali bayar ${formatRupiah(current.upfront_price)}. ` : ""}
            Saat dibuka, paket muncul di halaman program dan dibayar lewat alur yang sama dengan kelas live. Masa akses mulai dihitung saat
            pembayaran diterima.
            {pkg && (
              <>
                {" "}
                {buyers} pembeli.{" "}
                <Link href={`/admin/batch/${pkg.id}`} className="font-medium text-red-700 hover:underline">
                  Lihat pembeli
                </Link>
              </>
            )}
          </p>
        </Card>
      )}

      <Card title="Tambah video" className="mb-6">
        <RecordingForm programId={current.id} nextChapter={chapters.at(-1)?.[0] ?? 1} />
        <p className="mt-2 text-xs text-stone-500">
          Unggah videonya ke YouTube (pilih &quot;Tidak publik&quot;) atau Google Drive (akses &quot;Siapa saja yang memiliki link&quot;), lalu tempel linknya
          di sini. Siswa membuka video lewat area belajar, jadi progres tontonannya tercatat.
        </p>
      </Card>

      <Card title={`Daftar video ${current.name}`} count={videos.length}>
        {videos.length === 0 ? (
          <Empty>Belum ada video untuk program ini.</Empty>
        ) : (
          <div className="space-y-5">
            {chapters.map(([chapter, items]) => (
              <div key={chapter}>
                <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Bab {chapter}</p>
                <ul className="mt-1 divide-y divide-stone-100">
                  {items.map((v) => (
                    <li key={v.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                      <a href={v.url} target="_blank" rel="noreferrer" className="text-stone-900 hover:text-red-700 hover:underline">
                        {v.title}
                      </a>
                      <form action={deleteRecording.bind(null, v.id)}>
                        <ConfirmButton
                          className="text-xs text-red-700 hover:underline"
                          title="Hapus video ini?"
                          message={`"${v.title}" (bab ${chapter}) akan dihapus dari daftar rekaman siswa.`}
                          confirmLabel="Ya, hapus video"
                        >
                          Hapus
                        </ConfirmButton>
                      </form>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  );
}
