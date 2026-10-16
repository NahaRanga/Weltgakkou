import { activeSocial, type SocialKey } from "@/lib/site";

// Ikon sederhana 24x24 (stroke) untuk tiap akun sosial media.
const icons: Record<SocialKey, React.ReactNode> = {
  instagram: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
    </>
  ),
  tiktok: <path d="M14 3v11.5a3.5 3.5 0 1 1-3.5-3.5M14 3c.4 2.6 2.2 4.4 5 4.6" />,
  youtube: (
    <>
      <rect x="2.5" y="5.5" width="19" height="13" rx="4" />
      <path d="m10 9 5 3-5 3z" fill="currentColor" />
    </>
  ),
  facebook: <path d="M14.5 8H17V4.5h-2.5A4 4 0 0 0 10.5 8.5V11H8v3.5h2.5V21H14v-6.5h2.6L17 11h-3V8.9c0-.5.4-.9.9-.9z" />,
  whatsapp: <path d="M4 20l1.2-4A8 8 0 1 1 8 18.8zM9 8.5c0 3.5 3 6.5 6.5 6.5l1-1.5-2-1-1 .8a4.5 4.5 0 0 1-2.3-2.3l.8-1-1-2z" />,
};

export function SocialIcon({ name, className = "h-5 w-5" }: { name: SocialKey; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      {icons[name]}
    </svg>
  );
}

export function SocialLinks({ className = "", withLabel = false }: { className?: string; withLabel?: boolean }) {
  const links = activeSocial();
  if (links.length === 0) return null;
  return (
    <div className={`flex flex-wrap gap-3 ${className}`}>
      {links.map((s) => (
        <a
          key={s.key}
          href={s.url}
          target="_blank"
          rel="noreferrer"
          aria-label={s.label}
          className={`flex items-center gap-2 text-stone-600 hover:text-red-700 ${withLabel ? "rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm font-medium" : ""}`}
        >
          <SocialIcon name={s.key} />
          {withLabel && s.label}
        </a>
      ))}
    </div>
  );
}
