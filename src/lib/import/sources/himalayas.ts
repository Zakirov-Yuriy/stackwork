import type { RawJob, SourceAdapter } from "../types";
import { fetchJson } from "../http";
import { normalizePeriod } from "../classify";

/**
 * Himalayas: https://himalayas.app/jobs/api
 * Без ключа, по 20 вакансий на страницу, курсор для следующих.
 * Ссылка отклика ведёт на Himalayas (applicationLink с utm_source=api).
 */

type HimalayasJob = {
  title: string;
  excerpt?: string;
  companyName: string;
  companySlug?: string;
  companyLogo?: string;
  employmentType?: string;
  minSalary?: number | null;
  maxSalary?: number | null;
  salaryPeriod?: string | null;
  seniority?: string[];
  currency?: string | null;
  locationRestrictions?: string[];
  timezoneRestrictions?: number[];
  categories?: string[];
  parentCategories?: string[];
  description: string;
  pubDate: number;
  expiryDate?: number | null;
  applicationLink: string;
  guid: string;
};

type HimalayasResponse = { jobs: HimalayasJob[]; nextCursor?: string | null; totalCount?: number };

export const himalayas: SourceAdapter = {
  source: "HIMALAYAS",
  label: "Himalayas",
  homepage: "https://himalayas.app",
  staleDays: 21,
  terms: "Ссылка на вакансию на Himalayas; описание содержит пометку «Originally posted on Himalayas».",
  async fetch({ limit, maxAgeDays, log }) {
    const out: RawJob[] = [];
    const minDate = Date.now() - maxAgeDays * 86_400_000;
    let cursor: string | null | undefined;
    let pages = 0;
    // Лента отсортирована по дате: как только пошли старые, дальше не листаем
    while (out.length < limit && pages < 40) {
      const url = `https://himalayas.app/jobs/api?limit=20${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`;
      const data = await fetchJson<HimalayasResponse>(url);
      pages++;
      let old = 0;
      for (const j of data.jobs) {
        const publishedAt = new Date(j.pubDate * 1000);
        if (publishedAt.getTime() < minDate) {
          old++;
          continue;
        }
        out.push({
          source: "HIMALAYAS",
          externalId: j.guid,
          externalUrl: j.guid,
          applyUrl: j.applicationLink || j.guid,
          title: j.title,
          companyName: j.companyName,
          companyLogo: j.companyLogo || null,
          descriptionHtml: j.description || j.excerpt || "",
          tags: [...(j.parentCategories ?? []), ...(j.categories ?? []).map((c) => c.replace(/-/g, " "))],
          publishedAt,
          expiresAt: j.expiryDate ? new Date(j.expiryDate * 1000) : null,
          salary:
            j.minSalary || j.maxSalary
              ? { min: j.minSalary ?? null, max: j.maxSalary ?? null, currency: j.currency ?? "USD", period: normalizePeriod(j.salaryPeriod) ?? "YEAR" }
              : null,
          remote: true,
          locationNote: j.locationRestrictions?.length ? j.locationRestrictions.slice(0, 4).join(", ") : null,
          employment: /part/i.test(j.employmentType ?? "") ? "PART_TIME" : /contract|freelance/i.test(j.employmentType ?? "") ? "CONTRACT" : "FULL_TIME",
          seniorityHint: j.seniority?.join(" ") || null,
        });
      }
      if (!data.nextCursor || old === data.jobs.length) break;
      cursor = data.nextCursor;
    }
    log(`страниц: ${pages}`);
    return out;
  },
};
