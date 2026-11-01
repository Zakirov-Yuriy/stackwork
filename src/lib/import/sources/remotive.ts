import type { RawJob, SourceAdapter } from "../types";
import { fetchJson } from "../http";

/**
 * Remotive: https://github.com/remotive-com/remote-jobs-api
 * Без ключа. Условия: ссылка на вакансию на Remotive и упоминание источника,
 * обновлять не чаще 4 раз в день, не чаще 2 запросов в минуту.
 *
 * С осени 2026 публичный API отдаёт небольшую подборку (около 12 вакансий) и не
 * фильтрует по category: с любыми параметрами приходит один и тот же список.
 * Поэтому делаем один запрос и убираем повторы по id, а IT отбирает общий классификатор.
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

export const remotive: SourceAdapter = {
  source: "REMOTIVE",
  label: "Remotive",
  homepage: "https://remotive.com",
  staleDays: 3,
  terms: "Ссылка на вакансию на Remotive и упоминание источника. Не чаще 4 обновлений в день.",
  async fetch({ limit, maxAgeDays, log }) {
    const out: RawJob[] = [];
    const seen = new Set<string>();
    const minDate = Date.now() - maxAgeDays * 86_400_000;
    const data = await fetchJson<RemotiveResponse>(`https://remotive.com/api/remote-jobs?limit=${limit}`);
    log(`получено ${data.jobs.length}, всего в API ${data["job-count"] ?? "?"}`);
    for (const j of data.jobs) {
      const externalId = String(j.id);
      if (seen.has(externalId)) continue;
      seen.add(externalId);
      const publishedAt = new Date(j.publication_date);
      if (Number.isNaN(publishedAt.getTime()) || publishedAt.getTime() < minDate) continue;
      out.push({
        source: "REMOTIVE",
        externalId,
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
    return out;
  },
};
