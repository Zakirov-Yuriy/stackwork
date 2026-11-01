import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { siteUrl } from "@/lib/mail";
import { routing } from "@/i18n/routing";
import { localizedPath } from "@/i18n/seo";

export const dynamic = "force-dynamic";

type Entry = MetadataRoute.Sitemap[number];

/** Одна запись на каждый язык, с перекрёстными ссылками hreflang */
function localized(path: string, extra: Omit<Entry, "url" | "alternates">): Entry[] {
  const languages = Object.fromEntries(routing.locales.map((l) => [l, siteUrl(localizedPath(path, l))]));
  return routing.locales.map((l) => ({ url: siteUrl(localizedPath(path, l)), alternates: { languages }, ...extra }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [vacancies, companies] = await Promise.all([
    db.vacancy.findMany({ where: { status: "PUBLISHED" }, select: { slug: true, updatedAt: true }, orderBy: { publishedAt: "desc" }, take: 5000 }),
    db.company.findMany({ where: { vacancies: { some: { status: "PUBLISHED" } } }, select: { slug: true, updatedAt: true } }),
  ]);

  return [
    ...localized("/", { changeFrequency: "hourly", priority: 1 }),
    ...localized("/companies", { changeFrequency: "daily", priority: 0.6 }),
    ...localized("/salaries", { changeFrequency: "daily", priority: 0.6 }),
    ...localized("/pricing", { changeFrequency: "monthly", priority: 0.4 }),
    ...vacancies.flatMap((v) => localized(`/vacancies/${v.slug}`, { lastModified: v.updatedAt, changeFrequency: "daily", priority: 0.8 })),
    ...companies.flatMap((c) => localized(`/companies/${c.slug}`, { lastModified: c.updatedAt, changeFrequency: "weekly", priority: 0.5 })),
  ];
}
