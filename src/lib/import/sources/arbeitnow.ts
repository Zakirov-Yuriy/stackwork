import type { RawJob, SourceAdapter } from "../types";
import { fetchJson } from "../http";

/**
 * Arbeitnow: https://www.arbeitnow.com/api/job-board-api
 * Без ключа, Европа (в основном Германия), по 300 на страницу. Берём только remote.
 */

type ArbeitnowJob = {
  slug: string;
  company_name: string;
  title: string;
  description: string;
  remote: boolean;
  url: string;
  tags?: string[];
  job_types?: string[];
  location?: string;
  created_at: number;
};

type ArbeitnowResponse = { data: ArbeitnowJob[]; links?: { next?: string | null } };

export const arbeitnow: SourceAdapter = {
  source: "ARBEITNOW",
  label: "Arbeitnow",
  homepage: "https://www.arbeitnow.com",
  staleDays: 21,
  terms: "Ссылка на вакансию на Arbeitnow.",
  async fetch({ limit, maxAgeDays, log }) {
    const out: RawJob[] = [];
    const minDate = Date.now() - maxAgeDays * 86_400_000;
    let url: string | null = "https://www.arbeitnow.com/api/job-board-api";
    let pages = 0;
    while (url && out.length < limit && pages < 6) {
      const data: ArbeitnowResponse = await fetchJson<ArbeitnowResponse>(url);
      pages++;
      let old = 0;
      for (const j of data.data) {
        const publishedAt = new Date(j.created_at * 1000);
        if (publishedAt.getTime() < minDate) {
          old++;
          continue;
        }
        if (!j.remote) continue;
        const types = (j.job_types ?? []).join(" ").toLowerCase();
        out.push({
          source: "ARBEITNOW",
          externalId: j.slug,
          externalUrl: j.url,
          applyUrl: j.url,
          title: j.title,
          companyName: j.company_name,
          descriptionHtml: j.description,
          tags: j.tags ?? [],
          publishedAt,
          remote: true,
          location: j.location || null,
          locationNote: j.location ? `${j.location}, Germany` : "Germany / EU",
          employment: /teilzeit|part/.test(types) ? "PART_TIME" : /freelance|werkstudent|praktikum|intern/.test(types) ? "CONTRACT" : "FULL_TIME",
        });
      }
      if (old === data.data.length) break;
      url = data.links?.next ?? null;
    }
    log(`страниц: ${pages}`);
    return out;
  },
};
