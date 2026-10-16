import { ChangePasswordForm, ProfileForm } from "@/components/admin-controls";
import { Card, PageTitle } from "@/components/admin/ui";
import { requireDb, requireStaff } from "@/lib/auth";

export const metadata = { title: "Profil" };

export default async function ProfilePage() {
  const user = await requireStaff();
  const { data } = await requireDb().from("profiles").select("whatsapp").eq("id", user.id).maybeSingle();
  return (
    <>
      <PageTitle title="Profil" subtitle={`${user.email} · ${user.role === "admin" ? "Admin" : "Pengajar"}`} />
      <div className="grid max-w-4xl gap-6 md:grid-cols-2">
        <Card title="Data diri">
          <ProfileForm fullName={user.fullName} whatsapp={data?.whatsapp ?? null} />
        </Card>
        <Card title="Ganti password">
          <ChangePasswordForm />
        </Card>
      </div>
    </>
  );
}
