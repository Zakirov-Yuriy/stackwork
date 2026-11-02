import type { RawJob, SourceAdapter } from "../types";
import { fetchJson } from "../http";
import { isItJob } from "../classify";

/**
 * SmartRecruiters Posting API: https://developers.smartrecruiters.com/docs/posting-api
 * Открытый список вакансий компании: api.smartrecruiters.com/v1/companies/{id}/postings,
 * описание отдельным запросом на каждую вакансию, поэтому сначала отбираем по названию и формату.
 */

type SrPosting = {
  id: string;
  name: string;
  releasedDate?: string;
  company?: { identifier?: string; name?: string };
  location?: { city?: string; country?: string; remote?: boolean; hybrid?: boolean; fullLocation?: string };
  function?: { label?: string };
  department?: { label?: string };
  typeOfEmployment?: { label?: string };
  experienceLevel?: { label?: string };
  language?: string;
};

type SrList = { totalFound?: number; content?: SrPosting[] };
type SrDetail = SrPosting & { applyUrl?: string; postingUrl?: string; jobAd?: { sections?: Record<string, { title?: string; text?: string }> } };

const PAGE = 100;

export const smartrecruiters: SourceAdapter = {
  source: "SMARTRECRUITERS",
  label: "SmartRecruiters",
  homepage: "https://www.smartrecruiters.com",
  staleDays: 3,
  needsBoards: true,
  ignoreAge: true,
  terms: "Открытая доска вакансий работодателя. Отклик ведёт на страницу работодателя.",
  async fetch({ limit, boards = [], log, deadline, remoteOnly }) {
    const out: RawJob[] = [];
    for (const company of boards) {
      if (deadline && Date.now() > deadline) {
        log(`лимит времени, остановились на ${company}`);
        break;
      }
      const list: SrPosting[] = [];
      try {
        for (let offset = 0; offset < 2000; offset += PAGE) {
          const page = await fetchJson<SrList>(`https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(company)}/postings?limit=${PAGE}&offset=${offset}`);
          list.push(...(page.content ?? []));
          if ((page.content ?? []).length < PAGE) break;
        }
      } catch {
        log(`${company}: ошибка списка`);
        continue;
      }
      // Описание нужно запрашивать отдельно: берём только IT и (если включено) только удалённые
      const picked = list.filter((p) => isItJob(p.name, [p.function?.label ?? "", p.department?.label ?? ""]) && (!remoteOnly || p.location?.remote)).slice(0, 300);
      let taken = 0;
      for (let i = 0; i < picked.length; i += 5) {
        if (deadline && Date.now() > deadline) break;
        const details = await Promise.all(picked.slice(i, i + 5).map((p) => fetchJson<SrDetail>(`https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(company)}/postings/${p.id}`).catch(() => null)));
        for (const d of details) {
          if (!d) continue;
          const sections = Object.values(d.jobAd?.sections ?? {});
          const html = sections.map((s) => `${s.title ? `<h3>${s.title}</h3>` : ""}${s.text ?? ""}`).join("");
          const remote = Boolean(d.location?.remote);
          out.push({
            source: "SMARTRECRUITERS",
            externalId: `${company}:${d.id}`,
            externalUrl: d.postingUrl ?? `https://jobs.smartrecruiters.com/${company}/${d.id}`,
            applyUrl: d.applyUrl ?? d.postingUrl ?? `https://jobs.smartrecruiters.com/${company}/${d.id}`,
            title: d.name,
            companyName: d.company?.name ?? company,
            descriptionHtml: html,
            tags: [d.function?.label ?? "", d.department?.label ?? ""].filter(Boolean),
            publishedAt: new Date(d.releasedDate ?? Date.now()),
            salary: null,
            remote,
            location: remote ? null : d.location?.fullLocation ?? d.location?.city ?? null,
            locationNote: remote ? d.location?.country?.toUpperCase() ?? null : null,
            employment: /part/i.test(d.typeOfEmployment?.label ?? "") ? "PART_TIME" : /contract|temporary|fixed/i.test(d.typeOfEmployment?.label ?? "") ? "CONTRACT" : "FULL_TIME",
            seniorityHint: d.experienceLevel?.label ?? null,
            language: d.language?.slice(0, 2) ?? null,
          });
          taken++;
          if (out.length >= limit) return out;
        }
      }
      log(`${company}: ${list.length} на доске, подошло ${picked.length}, взято ${taken}`);
    }
    return out;
  },
};
