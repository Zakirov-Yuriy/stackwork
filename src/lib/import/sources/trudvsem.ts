import type { RawJob, SourceAdapter } from "../types";
import { fetchJson } from "../http";
import { isItJob } from "../classify";

/**
 * «Работа России» (trudvsem.ru), портал Роструда. Открытые данные:
 * https://trudvsem.ru/opendata/api (opendata.trudvsem.ru/api/v1/vacancies).
 * Русскоязычные вакансии с зарплатой в рублях, городом и контактами работодателя.
 * Локальный рынок: фильтры «только удалённые» и «языки» к нему не применяются.
 */

type TvVacancy = {
  id: string;
  "job-name": string;
  vac_url: string;
  "creation-date"?: string;
  date_modify?: string;
  salary_min?: number | string;
  salary_max?: number | string;
  employment?: string;
  schedule?: string;
  qualification?: string;
  duty?: string;
  requirements?: string;
  region?: { name?: string };
  company?: { name?: string; site?: string; url?: string };
  category?: { specialisation?: string };
  requirement?: { experience?: number | string };
  addresses?: { address?: Array<{ location?: string }> };
  skills?: string[];
  typicalPosition?: string;
};

type TvResponse = { status?: string; meta?: { total?: number; limit?: number }; results?: { vacancies?: Array<{ vacancy: TvVacancy }> } };

/** Запросы, которыми собираем IT-вакансии; дальше отбирает общий классификатор */
const QUERIES = ["разработчик", "программист", "devops", "тестировщик", "qa", "аналитик данных", "data scientist", "data engineer", "системный администратор", "frontend", "backend", "администратор баз данных", "информационной безопасности", "1с", "ml", "python", "java", "javascript", "golang", "c#"];

const PAGE = 100;

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** «Разработка ПО. Сопровождение. Запуск.» → список, если предложения похожи на пункты */
function block(title: string, text: string | undefined): string {
  const t = (text ?? "").trim();
  if (!t) return "";
  const parts = t.split(/(?<=[.;])\s+(?=[А-ЯA-Z])/).map((p) => p.trim()).filter((p) => p.length > 3);
  if (parts.length >= 3) return `<h3>${title}</h3><ul>${parts.map((p) => `<li>${esc(p)}</li>`).join("")}</ul>`;
  return `<h3>${title}</h3><p>${esc(t)}</p>`;
}

const LEGAL_FORMS = /^(?:(?:ООО|АО|ПАО|ЗАО|ОАО|НАО|ИП|ГУП|МУП|ФГУП|ГБУ|ГКУ|МБУ|МКУ|ФГБУ|ФГАОУ|ФГАУ|АНО|НКО|ТОО|ЧП)\s+)+/i;

/** «ООО "ЯНДЕКС.ТЕХНОЛОГИИ"» → «Яндекс.Технологии»: убираем форму собственности и кавычки, капс приводим к обычному регистру */
function prettyCompany(raw: string | undefined): string {
  let name = (raw ?? "").replace(/[«»"'“”„]/g, " ").replace(/\s+/g, " ").trim().replace(LEGAL_FORMS, "").trim();
  if (name && !/[a-zа-яё]/.test(name)) {
    // Слова и части через точку («ЯНДЕКС.ТЕХНОЛОГИИ») с заглавной, короткие аббревиатуры (НИИ, ИТ) как есть
    name = name
      .split(/([\s.-])/)
      .map((w) => (w.length <= 3 ? w : w.charAt(0) + w.slice(1).toLowerCase()))
      .join("");
  }
  return name || "Работодатель";
}

function cityOf(v: TvVacancy): string | null {
  const addr = v.addresses?.address?.[0]?.location ?? "";
  const m = /(?:^|,\s*)(?:г\.?\s*|город\s+)([А-ЯЁ][\w-]+(?:\s[А-ЯЁ][\w-]+)?)/iu.exec(addr);
  if (m) return m[1];
  const region = v.region?.name ?? "";
  if (/^(Москва|Санкт-Петербург|Севастополь)$/.test(region)) return region;
  return region.replace(/\s*(область|край|республика|автономный округ)\s*/i, "").trim() || null;
}

export const trudvsem: SourceAdapter = {
  source: "TRUDVSEM",
  label: "Работа России",
  homepage: "https://trudvsem.ru",
  staleDays: 14,
  localMarket: true,
  terms: "Открытые данные Роструда. Ссылка на вакансию на trudvsem.ru.",
  async fetch({ limit, maxAgeDays, log, deadline }) {
    const out: RawJob[] = [];
    const seen = new Set<string>();
    const minDate = Date.now() - maxAgeDays * 86_400_000;
    for (const q of QUERIES) {
      let got = 0;
      for (let offset = 0; offset < 20; offset++) {
        if (deadline && Date.now() > deadline) {
          log(`лимит времени, остановились на «${q}»`);
          return out;
        }
        let data: TvResponse;
        try {
          data = await fetchJson<TvResponse>(`https://opendata.trudvsem.ru/api/v1/vacancies?text=${encodeURIComponent(q)}&limit=${PAGE}&offset=${offset}`);
        } catch {
          log(`«${q}»: ошибка запроса`);
          break;
        }
        const list = data.results?.vacancies ?? [];
        for (const { vacancy: v } of list) {
          if (!v?.id || seen.has(v.id)) continue;
          seen.add(v.id);
          if (!isItJob(v["job-name"] ?? "", [v.category?.specialisation ?? ""])) continue;
          const publishedAt = new Date(v.date_modify ?? v["creation-date"] ?? Date.now());
          if (Number.isNaN(publishedAt.getTime()) || publishedAt.getTime() < minDate) continue;
          const remote = /дистанц|удал[её]н/i.test(`${v.employment ?? ""} ${v.schedule ?? ""}`);
          const min = Number(v.salary_min) || null;
          const max = Number(v.salary_max) || null;
          const exp = Number(v.requirement?.experience);
          const parts = [block("Обязанности", v.duty), block("Требования", v.requirements)];
          if (v.schedule || v.employment) parts.push(`<p>${esc([v.employment, v.schedule].filter(Boolean).join(" · "))}</p>`);
          out.push({
            source: "TRUDVSEM",
            externalId: v.id,
            externalUrl: v.vac_url,
            applyUrl: v.vac_url,
            title: v["job-name"].trim(),
            companyName: prettyCompany(v.company?.name),
            companyWebsite: v.company?.site ? (/^https?:\/\//.test(v.company.site) ? v.company.site : `https://${v.company.site}`) : null,
            descriptionHtml: parts.join(""),
            tags: [v.category?.specialisation ?? "", v.typicalPosition ?? "", ...(v.skills ?? [])].filter(Boolean),
            publishedAt,
            salary: min || max ? { min, max, currency: "RUB", period: "MONTH" } : null,
            remote,
            location: cityOf(v),
            locationNote: remote ? "Россия" : null,
            employment: /неполн|частичн/i.test(v.schedule ?? "") ? "PART_TIME" : "FULL_TIME",
            seniorityHint: v.qualification ?? (Number.isFinite(exp) ? (exp >= 6 ? "Senior" : exp >= 3 ? "Middle" : exp >= 1 ? "Junior" : null) : null),
            language: "ru",
          });
          got++;
          if (out.length >= limit) {
            log(`лимит ${limit} вакансий`);
            return out;
          }
        }
        if (list.length < PAGE) break;
      }
      log(`«${q}»: +${got}`);
    }
    return out;
  },
};
