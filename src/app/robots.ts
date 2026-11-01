import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/mail";
import { routing } from "@/i18n/routing";

const PRIVATE = ["/employer", "/me", "/login", "/register", "/forgot", "/reset", "/verify", "/report"];

export default function robots(): MetadataRoute.Robots {
  // Те же разделы закрыты и с языковым префиксом: /en/employer, /en/me и т. д.
  const prefixes = routing.locales.filter((l) => l !== routing.defaultLocale).map((l) => `/${l}`);
  const disallow = ["/admin", "/api/", ...PRIVATE, ...prefixes.flatMap((p) => PRIVATE.map((path) => `${p}${path}`))];
  return {
    rules: [{ userAgent: "*", allow: "/", disallow }],
    sitemap: siteUrl("/sitemap.xml"),
  };
}
