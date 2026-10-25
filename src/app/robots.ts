import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/mail";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/employer", "/admin", "/me", "/api/", "/login", "/register", "/forgot", "/reset", "/verify", "/report"],
      },
    ],
    sitemap: siteUrl("/sitemap.xml"),
  };
}
