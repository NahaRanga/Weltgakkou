export type ParticipantProfile = {
  full_name: string;
  whatsapp: string | null;
  email: string | null;
  nickname: string | null;
  gender: string | null;
  birth_place_date: string | null;
  domicile: string | null;
  address: string | null;
  education: string | null;
  occupation: string | null;
  tiktok: string | null;
  instagram: string | null;
  studied_before: boolean | null;
  prior_level: string | null;
  learning_goal: string | null;
};

export const participantColumns =
  "full_name, whatsapp, email, nickname, gender, birth_place_date, domicile, address, education, occupation, tiktok, instagram, studied_before, prior_level, learning_goal";

export function participantRows(p: ParticipantProfile): [string, string | null][] {
  const studied = p.studied_before === null ? null : p.studied_before ? `Sudah${p.prior_level ? ` (${p.prior_level})` : ""}` : "Belum";
  return [
    ["Panggilan", p.nickname],
    ["Email", p.email],
    ["WhatsApp", p.whatsapp],
    ["Jenis kelamin", p.gender],
    ["TTL", p.birth_place_date],
    ["Domisili", p.domicile],
    ["Alamat", p.address],
    ["Pendidikan", p.education],
    ["Pekerjaan", p.occupation],
    ["TikTok", p.tiktok],
    ["Instagram", p.instagram],
    ["Pernah belajar", studied],
    ["Tujuan", p.learning_goal],
  ];
}

export function ParticipantDetails({ p }: { p: ParticipantProfile }) {
  return (
    <details className="mt-1 text-xs text-stone-600">
      <summary className="cursor-pointer text-stone-500">Data peserta</summary>
      <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
        {participantRows(p)
          .filter(([, value]) => value)
          .map(([label, value]) => (
            <div key={label} className="contents">
              <dt className="text-stone-500">{label}</dt>
              <dd className="text-stone-800">{value}</dd>
            </div>
          ))}
      </dl>
    </details>
  );
}
