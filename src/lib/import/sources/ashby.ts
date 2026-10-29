import type { RawJob, SourceAdapter } from "../types";
import { fetchJson, HttpError } from "../http";

/**
 * Ashby Job Board API: https://developers.ashbyhq.com/reference/job-postings
 * Открытая доска компании: api.ashbyhq.com/posting-api/job-board/{board}?includeCompensation=true
 */

type AshbyJob = {
  id: string;
  title: string;
  department?: string;
  team?: string;
  employmentType?: string;
  location?: string;
  secondaryLocations?: Array<{ location?: string }>;
  publishedAt?: string;
  isListed?: boolean;
  isRemote?: boolean;
  workplaceType?: string;
  descriptionHtml?: string;
  descriptionPlain?: string;
  jobUrl: string;
  applyUrl?: string;
  compensation?: {
    compensationTierSummary?: string;
    scrapeableCompensationSalarySummary?: string;
    summaryComponents?: Array<{ compensationType?: string; interval?: string; currencyCode?: string; minValue?: number; maxValue?: number }>;
  };
};

type AshbyResponse = { jobs: AshbyJob[] };

export const ashby: SourceAdapter = {
  source: "ASHBY",
  label: "Ashby",
  homepage: "https://www.ashbyhq.com",
  staleDays: 3,
  needsBoards: true,
  terms: "Открытая доска вакансий работодателя. Отклик ведёт на страницу работодателя.",
  async fetch({ limit, maxAgeDays, boards = [], log }) {
    const out: RawJob[] = [];
    const minDate = Date.now() - maxAgeDays * 86_400_000;
    for (const board of boards) {
      let data: AshbyResponse;
      try {
        data = await fetchJson<AshbyResponse>(`https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(board)}?includeCompensation=true`);
      } catch (e) {
        log(`${board}: ${e instanceof HttpError ? `HTTP ${e.status}` : "ошибка"}`);
        continue;
      }
      let taken = 0;
      for (const j of data.jobs) {
        if (j.isListed === false) continue;
        const publishedAt = j.publishedAt ? new Date(j.publishedAt) : new Date();
        if (publishedAt.getTime() < minDate) continue;
        if (out.length >= limit) break;
        const remote = Boolean(j.isRemote) || /remote/i.test(j.workplaceType ?? "");
        const comp = j.compensation?.summaryComponents?.find((c) => /salary/i.test(c.compensationType ?? ""));
        const interval = (comp?.interval ?? "").toUpperCase();
        out.push({
          source: "ASHBY",
          externalId: `${board}:${j.id}`,
          externalUrl: j.jobUrl,
          applyUrl: j.jobUrl,
          title: j.title,
          companyName: board,
          descriptionHtml: j.descriptionHtml || (j.descriptionPlain ? `<p>${j.descriptionPlain.replace(/\n{2,}/g, "</p><p>").replace(/\n/g, "<br>")}</p>` : ""),
          tags: [j.department, j.team].filter((x): x is string => Boolean(x)),
          publishedAt,
          salary:
            comp && (comp.minValue || comp.maxValue)
              ? {
                  min: comp.minValue ?? null,
                  max: comp.maxValue ?? null,
                  currency: comp.currencyCode ?? "USD",
                  period: /MONTH/.test(interval) ? "MONTH" : /HOUR/.test(interval) ? "HOUR" : "YEAR",
                }
              : j.compensation?.scrapeableCompensationSalarySummary
                ? { text: j.compensation.scrapeableCompensationSalarySummary }
                : null,
          remote,
          location: remote ? null : j.location || null,
          locationNote: remote ? j.location?.replace(/remote[,\s-]*/i, "").trim() || null : null,
          employment: /part/i.test(j.employmentType ?? "") ? "PART_TIME" : /contract|intern/i.test(j.employmentType ?? "") ? "CONTRACT" : "FULL_TIME",
        });
        taken++;
      }
      log(`${board}: ${data.jobs.length} на доске, взято ${taken}`);
    }
    return out;
  },
};
