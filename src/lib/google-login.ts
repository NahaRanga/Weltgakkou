// Tombol "Masuk dengan Google" baru tampil setelah provider Google dinyalakan di Supabase
// (butuh OAuth Client dari Google Cloud) lalu NEXT_PUBLIC_GOOGLE_LOGIN=on di .env.production.
export const googleLoginEnabled = () => process.env.NEXT_PUBLIC_GOOGLE_LOGIN === "on";
