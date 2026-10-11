// Awalan alamat bila situs dipasang di bawah sub-path (misalnya /weltgakko).
// Diisi saat build lewat NEXT_PUBLIC_BASE_PATH; kosong berarti di root domain.
export const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/$/, "");

// Link biasa (<a>, gambar, redirect di route handler) tidak ditambah basePath
// otomatis oleh Next, jadi lewatkan path-nya ke sini.
export function withBase(path: string) {
  return `${basePath}${path}`;
}
