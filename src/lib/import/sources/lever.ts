import type { RawJob, SourceAdapter } from "../types";
import { fetchJson, HttpError } from "../http";
import { normalizePeriod } from "../classify";

/**
 * Lever Postings API: https://github.com/lever/postings-api
 * Открытый список вакансий компании: api.lever.co/v0/postings/{company}?mode=json
 */

type LeverJob = {
  id: string;
  text: string;
  categories?: { commitment?: string; location?: string; team?: string; department?: string; allLocations?: string[] };
  description?: string;
  descriptionBody?: string;
  opening?: string;
  additional?: string;
  lists?: Array<{ text: string; content: string }>;
  hostedUrl: string;
  applyUrl?: string;
  createdAt?: number;
  workplaceType?: string;
  country?: string;
  salaryRange?: { min?: number; max?: number; currency?: string; interval?: string };
};

export const lever: SourceAdapter = {
  source: "LEVER",
  label: "Lever",
  homepage: "https://www.lever.co",
  staleDays: 3,
  needsBoards: true,
  terms: "Открытый список вакансий работодателя. Отклик ведёт на страницу работодателя.",
  async fetch({ limit, maxAgeDays, boards = [], log }) {
    const out: RawJob[] = [];
    const minDate = Date.now() - maxAgeDays * 86_400_000;
    for (const company of boards) {
      let data: LeverJob[];
      try {
        data = await fetchJson<LeverJob[]>(`https://api.lever.co/v0/postings/${encodeURIComponent(company)}?mode=json`);
      } catch (e) {
        log(`${company}: ${e instanceof HttpError ? `HTTP ${e.status}` : "ошибка"}`);
        continue;
      }
      let taken = 0;
      for (const j of data) {
        const publishedAt = j.createdAt ? new Date(j.createdAt) : new Date();
        if (publishedAt.getTime() < minDate) continue;
        if (out.length >= limit) break;
        const html = [
          j.opening ?? j.description ?? "",
          j.descriptionBody && j.descriptionBody !== j.description ? j.descriptionBody : "",
          ...(j.lists ?? []).map((l) => `<h3>${l.text}</h3><ul>${l.content}</ul>`),
          j.additional ?? "",
        ].join("\n");
        const commitment = (j.categories?.commitment ?? "").toLowerCase();
        const remote = j.workplaceType === "remote" || /remote/i.test(j.categories?.location ?? "");
        const sr = j.salaryRange;
        out.push({
          source: "LEVER",
          externalId: `${company}:${j.id}`,
          externalUrl: j.hostedUrl,
          applyUrl: j.hostedUrl,
          title: j.text,
          companyName: company,
          descriptionHtml: html,
          tags: [j.categories?.team, j.categories?.department].filter((x): x is string => Boolean(x)),
          publishedAt,
          salary: sr && (sr.min || sr.max) ? { min: sr.min ?? null, max: sr.max ?? null, currency: sr.currency ?? "USD", period: normalizePeriod(sr.interval) ?? "YEAR" } : null,
          remote,
          location: remote ? null : j.categories?.location || null,
          locationNote: remote ? j.categories?.location?.replace(/remote[,\s-]*/i, "").trim() || null : null,
          employment: /part/.test(commitment) ? "PART_TIME" : /contract|intern/.test(commitment) ? "CONTRACT" : "FULL_TIME",
        });
        taken++;
      }
      log(`${company}: ${data.length} в списке, взято ${taken}`);
    }
    return out;
  },
};
