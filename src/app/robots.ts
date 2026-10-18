import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/bayar", "/belajar", "/atur-password", "/auth"],
    },
    sitemap: "https://weltgakko.com/sitemap.xml",
  };
}
