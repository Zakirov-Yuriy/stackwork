import type { RawJob, SourceAdapter } from "../types";
import { fetchJson, HttpError, mapLimit } from "../http";
import { isItJob } from "../classify";

/**
 * Greenhouse Job Board API: https://developers.greenhouse.io/job-board.html
 * Открытый эндпоинт доски вакансий компании: boards-api.greenhouse.io/v1/boards/{token}/jobs?content=true
 * Это вакансии с сайта самого работодателя, отклик ведёт на его страницу.
 */

type GreenhouseJob = {
  id: number;
  absolute_url: string;
  title: string;
  company_name?: string;
  content: string;
  first_published?: string;
  updated_at?: string;
  location?: { name?: string };
  departments?: Array<{ name: string }>;
  offices?: Array<{ name: string }>;
  metadata?: Array<{ name: string; value: unknown }>;
  pay_input_ranges?: Array<{ min_cents?: number; max_cents?: number; currency_type?: string; title?: string }>;
  language?: string;
};

type GreenhouseResponse = { jobs: GreenhouseJob[]; meta?: { total?: number } };

export const greenhouse: SourceAdapter = {
  source: "GREENHOUSE",
  label: "Greenhouse",
  homepage: "https://www.greenhouse.com",
  staleDays: 3,
  needsBoards: true,
  ignoreAge: true,
  terms: "Открытая доска вакансий работодателя. Отклик ведёт на страницу работодателя.",
  async fetch({ limit, boards = [], log, deadline, remoteOnly }) {
    const out: RawJob[] = [];
    // Доски качаем параллельно по несколько штук: их может быть больше сотни
    const results = await mapLimit(boards, 6, async (token) => {
      if (deadline && Date.now() > deadline) return null;
      try {
        return { token, data: await fetchJson<GreenhouseResponse>(`https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(token)}/jobs?content=true`) };
      } catch (e) {
        log(`${token}: ${e instanceof HttpError ? `HTTP ${e.status}` : "ошибка"}`);
        return null;
      }
    });
    for (const r of results) {
      if (!r) continue;
      const { token, data } = r;
      let taken = 0;
      for (const j of data.jobs) {
        const publishedAt = new Date(j.first_published ?? j.updated_at ?? Date.now());
        if (out.length >= limit) break;
        const loc = j.location?.name ?? "";
        const remote = /remote/i.test(loc);
        // Лимит считаем по подходящим вакансиям: офисные и не-IT отсеиваем до записи
        if (remoteOnly && !remote) continue;
        if (!isItJob(j.title, (j.departments ?? []).map((d) => d.name))) continue;
        const pay = j.pay_input_ranges?.[0];
        out.push({
          source: "GREENHOUSE",
          externalId: `${token}:${j.id}`,
          externalUrl: j.absolute_url,
          applyUrl: j.absolute_url,
          title: j.title,
          companyName: j.company_name || token,
          descriptionHtml: j.content,
          tags: (j.departments ?? []).map((d) => d.name),
          publishedAt,
          salary:
            pay && (pay.min_cents || pay.max_cents)
              ? {
                  min: pay.min_cents ? Math.round(pay.min_cents / 100) : null,
                  max: pay.max_cents ? Math.round(pay.max_cents / 100) : null,
                  currency: pay.currency_type ?? "USD",
                  period: "YEAR",
                }
              : null,
          remote,
          location: remote ? null : loc || null,
          locationNote: remote ? loc.replace(/remote[,\s-]*/i, "").trim() || null : null,
          employment: "FULL_TIME",
          language: j.language ?? null,
        });
        taken++;
      }
      log(`${token}: ${data.jobs.length} на доске, взято ${taken}`);
    }
    return out;
  },
};
