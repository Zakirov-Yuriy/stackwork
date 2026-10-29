import type { RawJob, SourceAdapter } from "../types";
import { fetchJson, sleep } from "../http";

/**
 * Remotive: https://github.com/remotive-com/remote-jobs-api
 * Без ключа. Условия: ссылка на вакансию на Remotive и упоминание источника,
 * обновлять не чаще 4 раз в день, не чаще 2 запросов в минуту.
 */

type RemotiveJob = {
  id: number;
  url: string;
  title: string;
  company_name: string;
  company_logo?: string;
  company_logo_url?: string;
  category: string;
  tags?: string[];
  job_type?: string;
  publication_date: string;
  candidate_required_location?: string;
  salary?: string;
  description: string;
};

type RemotiveResponse = { jobs: RemotiveJob[]; "job-count": number };

const CATEGORIES = ["software-dev", "devops", "data", "qa"];

export const remotive: SourceAdapter = {
  source: "REMOTIVE",
  label: "Remotive",
  homepage: "https://remotive.com",
  staleDays: 3,
  terms: "Ссылка на вакансию на Remotive и упоминание источника. Не чаще 4 обновлений в день.",
  async fetch({ limit, maxAgeDays, log }) {
    const out: RawJob[] = [];
    const minDate = Date.now() - maxAgeDays * 86_400_000;
    const perCategory = Math.ceil(limit / CATEGORIES.length);
    for (let i = 0; i < CATEGORIES.length; i++) {
      // Лимит источника: не чаще 2 запросов в минуту
      if (i > 0) await sleep(31_000);
      const cat = CATEGORIES[i];
      const url = `https://remotive.com/api/remote-jobs?category=${cat}&limit=${perCategory}`;
      const data = await fetchJson<RemotiveResponse>(url);
      log(`${cat}: ${data.jobs.length}`);
      for (const j of data.jobs) {
        const publishedAt = new Date(j.publication_date);
        if (Number.isNaN(publishedAt.getTime()) || publishedAt.getTime() < minDate) continue;
        out.push({
          source: "REMOTIVE",
          externalId: String(j.id),
          externalUrl: j.url,
          applyUrl: j.url,
          title: j.title,
          companyName: j.company_name,
          companyLogo: j.company_logo_url || j.company_logo || null,
          descriptionHtml: j.description,
          tags: [j.category, ...(j.tags ?? [])],
          publishedAt,
          salary: j.salary ? { text: j.salary } : null,
          remote: true,
          locationNote: j.candidate_required_location || null,
          employment: j.job_type === "contract" ? "CONTRACT" : j.job_type === "part_time" ? "PART_TIME" : "FULL_TIME",
        });
      }
    }
    return out;
  },
};
