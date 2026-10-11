import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Tanpa R2 incremental cache dulu supaya tetap di paket gratis Cloudflare.
export default defineCloudflareConfig({});
