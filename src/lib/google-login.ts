// Tombol "Masuk dengan Google" baru tampil setelah provider Google dinyalakan di Supabase
// (butuh OAuth Client dari Google Cloud) lalu NEXT_PUBLIC_GOOGLE_LOGIN=on di .env.production.
// Aktif sejak 2026-10-18: project Google Cloud "Weltgakko" milik weltgakko@gmail.com, status In production.
export const googleLoginEnabled = () => process.env.NEXT_PUBLIC_GOOGLE_LOGIN === "on";
