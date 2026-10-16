import type { Instrumentation } from "next";

// Di production Next.js menyembunyikan pesan error halaman. Catat pesan aslinya
// supaya terlihat di log Worker Cloudflare (Observability).
export const onRequestError: Instrumentation.onRequestError = (err, request, context) => {
  const e = err as Error & { digest?: string };
  console.error("Error halaman", request.method, request.path, context.routePath, context.routeType, e?.digest ?? "", e?.message ?? String(err), e?.stack ?? "");
};
