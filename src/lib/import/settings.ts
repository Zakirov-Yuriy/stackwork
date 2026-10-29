import "server-only";
import { db } from "@/lib/db";
import type { VacancySource } from "@/generated/prisma/client";
import { IMPORT_SOURCES, isImportSource } from "./sources";

export type ImportSettings = {
  /** Какие источники включены в ежедневный импорт и кнопку «Запустить всё» */
  enabledSources: VacancySource[];
  /** Импортировать только вакансии с указанной зарплатой */
  requireSalary: boolean;
  /** Только удалённые вакансии (у досок ATS бывают офисные) */
  remoteOnly: boolean;
  /** Допустимые языки описания (ISO 639-1); пусто = любые */
  languages: string[];
  /** Не больше стольких вакансий с одного источника за запуск */
  maxPerSource: number;
  /** Не брать вакансии старше стольких дней */
  maxAgeDays: number;
  /** Публиковать сразу (иначе кладём в очередь модерации) */
  autoPublish: boolean;
  /** Доски ATS: токены компаний */
  greenhouseBoards: string[];
  leverCompanies: string[];
  ashbyBoards: string[];
};

export const DEFAULT_IMPORT_SETTINGS: ImportSettings = {
  enabledSources: ["REMOTIVE", "JOBICY", "REMOTEOK", "HIMALAYAS", "ARBEITNOW", "GREENHOUSE", "ASHBY"],
  requireSalary: false,
  remoteOnly: true,
  languages: ["en"],
  maxPerSource: 300,
  maxAgeDays: 30,
  autoPublish: true,
  // Проверенные открытые доски: вакансии с сайтов самих работодателей
  greenhouseBoards: ["gitlab", "grafanalabs"],
  leverCompanies: [],
  ashbyBoards: ["linear", "supabase", "posthog", "replit"],
};

const KEY = "import";

function list(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").map((s) => s.trim()).filter(Boolean) : [];
}

function clampInt(v: unknown, min: number, max: number, fallback: number): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(n)));
}

/** Приводит произвольный JSON к валидным настройкам, неизвестное отбрасывает. */
export function normalizeImportSettings(raw: unknown): ImportSettings {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const d = DEFAULT_IMPORT_SETTINGS;
  return {
    enabledSources: Array.isArray(r.enabledSources)
      ? (r.enabledSources.filter((s): s is string => typeof s === "string").filter(isImportSource) as VacancySource[])
      : d.enabledSources,
    requireSalary: typeof r.requireSalary === "boolean" ? r.requireSalary : d.requireSalary,
    remoteOnly: typeof r.remoteOnly === "boolean" ? r.remoteOnly : d.remoteOnly,
    languages: Array.isArray(r.languages) ? list(r.languages).map((l) => l.toLowerCase().slice(0, 2)) : d.languages,
    maxPerSource: clampInt(r.maxPerSource, 10, 2000, d.maxPerSource),
    maxAgeDays: clampInt(r.maxAgeDays, 1, 365, d.maxAgeDays),
    autoPublish: typeof r.autoPublish === "boolean" ? r.autoPublish : d.autoPublish,
    greenhouseBoards: Array.isArray(r.greenhouseBoards) ? list(r.greenhouseBoards) : d.greenhouseBoards,
    leverCompanies: Array.isArray(r.leverCompanies) ? list(r.leverCompanies) : d.leverCompanies,
    ashbyBoards: Array.isArray(r.ashbyBoards) ? list(r.ashbyBoards) : d.ashbyBoards,
  };
}

export async function getImportSettings(): Promise<ImportSettings> {
  const row = await db.setting.findUnique({ where: { key: KEY } });
  return normalizeImportSettings(row?.value);
}

export async function saveImportSettings(next: ImportSettings): Promise<void> {
  const value = normalizeImportSettings(next);
  await db.setting.upsert({ where: { key: KEY }, create: { key: KEY, value }, update: { value } });
}

export { IMPORT_SOURCES };
