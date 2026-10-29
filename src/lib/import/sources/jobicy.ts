import type { RawJob, SourceAdapter } from "../types";
import { fetchJson } from "../http";
import { normalizePeriod } from "../classify";

/**
 * Jobicy: https://jobicy.com/jobs-rss-feed
 * Без ключа, отдаёт вакансии за последние 7 дней, до 200 за запрос, курсор для следующих.
 * Условия: указывать Jobicy как источник, ссылка отклика ведёт на страницу вакансии на Jobicy.
 */

type JobicyJob = {
  id: number;
  url: string;
  jobTitle: string;
  companyName: string;
  companyLogo?: string;
  jobIndustry?: string[];
  jobType?: string[];
  jobGeo?: string;
  jobLevel?: string;
  jobExcerpt?: string;
  jobDescription: string;
  pubDate: string;
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryCurrency?: string | null;
  salaryPeriod?: string | null;
};

type JobicyResponse = { jobs: JobicyJob[]; nextCursor?: string | null; hasMore?: boolean };

const INDUSTRIES = ["engineering", "data-science"];

export const jobicy: SourceAdapter = {
  source: "JOBICY",
  label: "Jobicy",
  homepage: "https://jobicy.com",
  staleDays: 14,
  terms: "Указать Jobicy как источник, ссылка «Откликнуться» ведёт на Jobicy.",
  async fetch({ limit, maxAgeDays, log }) {
    const out: RawJob[] = [];
    const minDate = Date.now() - maxAgeDays * 86_400_000;
    for (const industry of INDUSTRIES) {
      let cursor: string | null | undefined;
      let got = 0;
      for (let page = 0; page < 5 && out.length < limit; page++) {
        const url = `https://jobicy.com/api/v2/remote-jobs?count=200&industry=${industry}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`;
        const data = await fetchJson<JobicyResponse>(url);
        got += data.jobs.length;
        for (const j of data.jobs) {
          const publishedAt = new Date(j.pubDate);
          if (Number.isNaN(publishedAt.getTime()) || publishedAt.getTime() < minDate) continue;
          const employment = (j.jobType ?? []).join(" ").toLowerCase();
          out.push({
            source: "JOBICY",
            externalId: String(j.id),
            externalUrl: j.url,
            applyUrl: j.url,
            title: j.jobTitle,
            companyName: j.companyName,
            companyLogo: j.companyLogo || null,
            descriptionHtml: j.jobDescription || j.jobExcerpt || "",
            tags: j.jobIndustry ?? [],
            publishedAt,
            salary:
              j.salaryMin || j.salaryMax
                ? {
                    min: j.salaryMin ?? null,
                    max: j.salaryMax ?? null,
                    currency: j.salaryCurrency ?? "USD",
                    period: normalizePeriod(j.salaryPeriod) ?? "YEAR",
                  }
                : null,
            remote: true,
            locationNote: j.jobGeo && j.jobGeo !== "Anywhere" ? j.jobGeo : null,
            employment: /contract|freelance/.test(employment) ? "CONTRACT" : /part/.test(employment) ? "PART_TIME" : "FULL_TIME",
            seniorityHint: j.jobLevel && j.jobLevel !== "Any" ? j.jobLevel : null,
          });
        }
        cursor = data.hasMore ? data.nextCursor : null;
        if (!cursor) break;
      }
      log(`${industry}: ${got}`);
    }
    return out;
  },
};
