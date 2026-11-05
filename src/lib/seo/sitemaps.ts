import { db } from "@/lib/db";
import { siteUrl } from "@/lib/mail";
import { routing } from "@/i18n/routing";
import { localizedPath } from "@/i18n/seo";

/**
 * Карта сайта: индекс /sitemap.xml и части /sitemaps/<name>.xml (страницы, вакансии по 2000,
 * компании). Части кешируются на час (revalidate в route.ts), чтобы робот не ждал
 * пробуждения базы и ответ не упирался в лимит времени функции.
 */

export const VACANCIES_PER_FILE = 2000;

type Entry = { path: string; lastModified?: Date | null; changeFrequency?: string; priority?: number };

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Одна запись на каждый язык, с перекрёстными ссылками hreflang */
function urlXml(e: Entry): string {
  const alternates = routing.locales.map((l) => `<xhtml:link rel="alternate" hreflang="${l}" href="${esc(siteUrl(localizedPath(e.path, l)))}"/>`).join("");
  return routing.locales
    .map((l) => {
      const parts = [`<loc>${esc(siteUrl(localizedPath(e.path, l)))}</loc>`, alternates];
      if (e.lastModified) parts.push(`<lastmod>${e.lastModified.toISOString()}</lastmod>`);
      if (e.changeFrequency) parts.push(`<changefreq>${e.changeFrequency}</changefreq>`);
      if (e.priority !== undefined) parts.push(`<priority>${e.priority}</priority>`);
      return `<url>${parts.join("")}</url>`;
    })
    .join("\n");
}

function urlset(entries: Entry[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${entries.map(urlXml).join("\n")}\n</urlset>`;
}

export async function sitemapNames(): Promise<string[]> {
  const total = await db.vacancy.count({ where: { status: "PUBLISHED" } });
  const files = Math.max(1, Math.ceil(total / VACANCIES_PER_FILE));
  return ["pages", ...Array.from({ length: files }, (_, i) => `vacancies-${i}`), "companies"];
}

export async function sitemapIndexXml(): Promise<string> {
  const names = await sitemapNames();
  const now = new Date().toISOString();
  const items = names.map((n) => `<sitemap><loc>${esc(siteUrl(`/sitemaps/${n}.xml`))}</loc><lastmod>${now}</lastmod></sitemap>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items}\n</sitemapindex>`;
}

/** Содержимое одной части; null, если такой нет */
export async function sitemapXml(name: string): Promise<string | null> {
  if (name === "pages") {
    return urlset([
      { path: "/", changeFrequency: "hourly", priority: 1 },
      { path: "/companies", changeFrequency: "daily", priority: 0.6 },
      { path: "/salaries", changeFrequency: "daily", priority: 0.6 },
      { path: "/pricing", changeFrequency: "monthly", priority: 0.4 },
    ]);
  }
  if (name === "companies") {
    const companies = await db.company.findMany({ where: { vacancies: { some: { status: "PUBLISHED" } } }, select: { slug: true, updatedAt: true }, orderBy: { slug: "asc" } });
    return urlset(companies.map((c) => ({ path: `/companies/${c.slug}`, lastModified: c.updatedAt, changeFrequency: "weekly", priority: 0.5 })));
  }
  const m = /^vacancies-(\d+)$/.exec(name);
  if (!m) return null;
  const page = Number(m[1]);
  // lastmod по дате публикации: updatedAt меняется при каждой сверке с источником и ни о чём не говорит
  const vacancies = await db.vacancy.findMany({
    where: { status: "PUBLISHED" },
    select: { slug: true, publishedAt: true, updatedAt: true },
    orderBy: [{ publishedAt: "desc" }, { id: "asc" }],
    skip: page * VACANCIES_PER_FILE,
    take: VACANCIES_PER_FILE,
  });
  if (!vacancies.length && page > 0) return null;
  return urlset(vacancies.map((v) => ({ path: `/vacancies/${v.slug}`, lastModified: v.publishedAt ?? v.updatedAt, changeFrequency: "daily", priority: 0.8 })));
}
