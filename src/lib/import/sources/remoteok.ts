import type { RawJob, SourceAdapter } from "../types";
import { fetchJson } from "../http";

/**
 * Remote OK: https://remoteok.com/api
 * Без ключа, один JSON со свежими вакансиями; первый элемент массива: условия.
 * Условия: dofollow-ссылка на страницу вакансии на Remote OK и упоминание названия «Remote OK».
 */

type RemoteOkJob = {
  slug: string;
  id: string;
  epoch: number;
  date: string;
  company: string;
  company_logo?: string;
  logo?: string;
  position: string;
  tags?: string[];
  description: string;
  location?: string;
  apply_url?: string;
  url: string;
  salary_min?: number;
  salary_max?: number;
};

type RemoteOkEntry = RemoteOkJob | { legal: string; last_updated?: number };

export const remoteok: SourceAdapter = {
  source: "REMOTEOK",
  label: "Remote OK",
  homepage: "https://remoteok.com",
  staleDays: 21,
  terms: "Dofollow-ссылка на вакансию на Remote OK и упоминание названия «Remote OK».",
  async fetch({ limit, maxAgeDays, log }) {
    const data = await fetchJson<RemoteOkEntry[]>("https://remoteok.com/api");
    const minDate = Date.now() - maxAgeDays * 86_400_000;
    const out: RawJob[] = [];
    let total = 0;
    for (const entry of data) {
      if (!("id" in entry)) continue;
      total++;
      const publishedAt = entry.epoch ? new Date(entry.epoch * 1000) : new Date(entry.date);
      if (Number.isNaN(publishedAt.getTime()) || publishedAt.getTime() < minDate) continue;
      if (out.length >= limit) break;
      const min = entry.salary_min && entry.salary_min > 0 ? entry.salary_min : null;
      const max = entry.salary_max && entry.salary_max > 0 ? entry.salary_max : null;
      out.push({
        source: "REMOTEOK",
        externalId: String(entry.id),
        externalUrl: entry.url,
        // По условиям Remote OK отклик ведёт на их страницу, а не напрямую к работодателю
        applyUrl: entry.url,
        title: entry.position,
        companyName: entry.company,
        companyLogo: entry.company_logo || entry.logo || null,
        descriptionHtml: entry.description,
        tags: entry.tags ?? [],
        publishedAt,
        salary: min || max ? { min, max, currency: "USD", period: "YEAR" } : null,
        remote: true,
        locationNote: entry.location && !/worldwide|anywhere/i.test(entry.location) ? entry.location : null,
        employment: "FULL_TIME",
      });
    }
    log(`всего в ленте: ${total}`);
    return out;
  },
};
