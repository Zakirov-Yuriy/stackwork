import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { siteUrl } from "@/lib/mail";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [vacancies, companies] = await Promise.all([
    db.vacancy.findMany({ where: { status: "PUBLISHED" }, select: { slug: true, updatedAt: true }, orderBy: { publishedAt: "desc" }, take: 5000 }),
    db.company.findMany({ where: { vacancies: { some: { status: "PUBLISHED" } } }, select: { slug: true, updatedAt: true } }),
  ]);

  return [
    { url: siteUrl("/"), changeFrequency: "hourly", priority: 1 },
    { url: siteUrl("/companies"), changeFrequency: "daily", priority: 0.6 },
    { url: siteUrl("/salaries"), changeFrequency: "daily", priority: 0.6 },
    { url: siteUrl("/pricing"), changeFrequency: "monthly", priority: 0.4 },
    ...vacancies.map((v) => ({ url: siteUrl(`/vacancies/${v.slug}`), lastModified: v.updatedAt, changeFrequency: "daily" as const, priority: 0.8 })),
    ...companies.map((c) => ({ url: siteUrl(`/companies/${c.slug}`), lastModified: c.updatedAt, changeFrequency: "weekly" as const, priority: 0.5 })),
  ];
}
