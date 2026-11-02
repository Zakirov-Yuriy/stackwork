import "server-only";
import { db } from "@/lib/db";
import type { VacancySource } from "@/generated/prisma/client";
import { isImportSource } from "@/lib/import/sources";

/** Настройки канала: хранятся в таблице Setting под ключом "telegram", правятся в админке. */
export type TelegramSettings = {
  /** Постить вакансии в канал */
  enabled: boolean;
  /** Канал: @username или числовой id */
  channel: string;
  /** Username бота, заполняется кнопкой «Подключить бота» (getMe) */
  botUsername: string;
  /** Не больше стольких постов в сутки */
  dailyLimit: number;
  /** Сначала вакансии с указанной зарплатой */
  salaryFirst: boolean;
  /** Какие импортные источники постить. Remotive по умолчанию нет: его условия запрещают перепубликацию */
  sources: VacancySource[];
  /** Постить вакансии работодателей после модерации */
  postEmployer: boolean;
  /** Кнопки под постом: прямые ссылки на сайт и отклик или через бота (только подписчикам) */
  linkMode: "direct" | "bot";
  /** Прикладывать к посту карточку-картинку */
  withImage: boolean;
  /** Когда бот был подключён (вебхук поставлен) */
  connectedAt: string | null;
  /** Итог последнего постинга */
  lastRun: { at: string; sent: number; error: string | null } | null;
};

export const DEFAULT_TELEGRAM_SETTINGS: TelegramSettings = {
  enabled: false,
  channel: "@stackworkjobs",
  botUsername: "",
  dailyLimit: 20,
  salaryFirst: true,
  sources: ["TRUDVSEM", "HACKERNEWS", "JOBICY", "REMOTEOK", "HIMALAYAS", "ARBEITNOW", "GREENHOUSE", "LEVER", "ASHBY", "SMARTRECRUITERS"],
  postEmployer: true,
  linkMode: "bot",
  withImage: true,
  connectedAt: null,
  lastRun: null,
};

const KEY = "telegram";

function lastRun(v: unknown): TelegramSettings["lastRun"] {
  if (!v || typeof v !== "object") return null;
  const r = v as Record<string, unknown>;
  if (typeof r.at !== "string") return null;
  return { at: r.at, sent: typeof r.sent === "number" ? r.sent : 0, error: typeof r.error === "string" ? r.error : null };
}

export function normalizeTelegramSettings(raw: unknown): TelegramSettings {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const d = DEFAULT_TELEGRAM_SETTINGS;
  const channel = typeof r.channel === "string" ? r.channel.trim().replace(/^https?:\/\/t\.me\//, "@").replace(/^(?!@|-?\d)/, "@") : d.channel;
  const limit = Number(r.dailyLimit);
  return {
    enabled: typeof r.enabled === "boolean" ? r.enabled : d.enabled,
    channel: channel || d.channel,
    botUsername: typeof r.botUsername === "string" ? r.botUsername.replace(/^@/, "").trim() : d.botUsername,
    dailyLimit: Number.isFinite(limit) ? Math.min(100, Math.max(1, Math.floor(limit))) : d.dailyLimit,
    salaryFirst: typeof r.salaryFirst === "boolean" ? r.salaryFirst : d.salaryFirst,
    sources: Array.isArray(r.sources) ? (r.sources.filter((s): s is string => typeof s === "string").filter(isImportSource) as VacancySource[]) : d.sources,
    postEmployer: typeof r.postEmployer === "boolean" ? r.postEmployer : d.postEmployer,
    linkMode: r.linkMode === "bot" ? "bot" : r.linkMode === "direct" ? "direct" : d.linkMode,
    withImage: typeof r.withImage === "boolean" ? r.withImage : d.withImage,
    connectedAt: typeof r.connectedAt === "string" ? r.connectedAt : null,
    lastRun: lastRun(r.lastRun),
  };
}

export async function getTelegramSettings(): Promise<TelegramSettings> {
  const row = await db.setting.findUnique({ where: { key: KEY } });
  return normalizeTelegramSettings(row?.value);
}

export async function saveTelegramSettings(patch: Partial<TelegramSettings>): Promise<TelegramSettings> {
  const current = await getTelegramSettings();
  const value = normalizeTelegramSettings({ ...current, ...patch });
  await db.setting.upsert({ where: { key: KEY }, create: { key: KEY, value }, update: { value } });
  return value;
}
