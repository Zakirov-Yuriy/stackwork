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
  smartrecruitersCompanies: string[];
  /** Версия набора настроек: при появлении новых источников старые сохранённые настройки дополняются */
  settingsVersion: number;
};

export const DEFAULT_IMPORT_SETTINGS: ImportSettings = {
  enabledSources: ["TRUDVSEM", "HACKERNEWS", "JOBICY", "REMOTEOK", "HIMALAYAS", "ARBEITNOW", "GREENHOUSE", "LEVER", "ASHBY", "SMARTRECRUITERS", "REMOTIVE"],
  requireSalary: false,
  remoteOnly: true,
  languages: ["en"],
  maxPerSource: 3000,
  maxAgeDays: 60,
  autoPublish: true,
  // Проверенные открытые доски (ноябрь 2026): вакансии с сайтов самих работодателей
  greenhouseBoards: ["databricks", "stripe", "anthropic", "cloudflare", "relativity", "elastic", "datadog", "okta", "mongodb", "braze", "samsara", "toast", "canonical", "roblox", "brex", "k2spacecorporation", "coinbase", "affirm", "gitlab", "adyen", "airbnb", "deliveroo", "flexport", "riotgames", "lyft", "pinterest", "scaleai", "fivetran", "reddit", "robinhood", "klaviyo", "figma", "epicgames", "twilio", "ionq", "grafanalabs", "mozilla", "asana", "intercom", "justworks", "instacart", "vercel", "gusto", "blackcanyonconsulting", "smartsheet", "oklo", "carta", "chime", "wrike", "twitch", "monzo", "sofi", "tailscale", "cabify", "duolingo", "newrelic", "fastly", "pagerduty", "ziprecruiter", "mixpanel", "discord", "checkr", "givedirectly", "n26", "bitwarden", "coursera", "contentful", "godaddy", "squarespace", "gocardless", "algolia", "dropbox", "udacity", "wise", "greenhouse", "coast", "thealleninstitute", "canopyworks", "wikimedia", "storyblok", "cockroachlabs", "planetscale", "typeform", "sumologic", "mattermost", "calendly", "lattice", "lastpass", "novacredit", "brightcoreenergy", "airtable", "khanacademy", "mcafee", "manifest", "udemy", "netlify", "disney", "remote"],
  leverCompanies: ["shieldai", "palantir", "zoox", "waabi", "spotify", "loftorbital", "meesho", "atomcomputing", "veo", "outreach", "cred", "cloudinary", "gausslabs", "lodgify", "neon", "blablacar", "rai", "curai", "findigs", "eleostech"],
  ashbyBoards: ["openai", "snowflake", "crusoe", "clickhouse", "iceye", "ramp", "notion", "elevenlabs", "perplexity", "cursor", "cohere", "Pear-VC", "baseten", "langchain", "lambda", "fireworks", "lovable", "supabase", "krakentech", "forus", "proxima-fusion", "vultr", "runway-ml", "amplitude", "modal", "sentry", "sentilink", "aptura", "incident", "confido", "permitflow", "render", "replit", "reframesystems", "voltai.careers", "linear", "braintrust", "livekit", "redis", "hiya", "socket", "runpod", "oscilar", "anyscale", "prior-labs", "norm-ai", "warp", "menlo", "middesk", "artificialanalysis", "aiuc", "turquoise-health", "resend", "footprint", "maincode", "iterable", "charge-robotics", "lancedb", "aleph", "rebar", "oneleet", "posthog", "Solace", "chariotclaims", "fullstory", "duck-duck-go", "radical-numerics", "airbyte", "ditto", "stream", "pinecone", "jupus", "DeepL", "Nango", "railway", "Railway", "shadeform", "smarkets", "somana.tech", "close", "unstructured", "sfcompute", "odyssey", "materialize", "llamaindex", "voladynamics", "deeter-analytics", "colonist", "comity", "deepsetai", "onecrew", "knock", "river", "mastra", "Mastra", "anterior", "clerk", "inngest", "opslevel", "weaviate", "growfig", "checkly", "TonicAI", "zed", "neon", "hightouch", "mux", "thundercompute", "tolmo", "luxor", "sheerhealth", "Neon", "productgenius", "category-labs"],
  settingsVersion: 2,
  smartrecruitersCompanies: ["AUTO1", "Ubisoft2", "Paradox", "Omio", "Wayfair"],
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

const OLD_GREENHOUSE = ["gitlab", "grafanalabs"];
const OLD_ASHBY = ["linear", "supabase", "posthog", "replit"];

/**
 * Настройки, сохранённые до появления новых источников (версия 1): включаем новые источники,
 * подставляем большой список досок, поднимаем лимиты. Пользовательские доски сохраняются.
 */
function upgrade(r: Record<string, unknown>): Record<string, unknown> {
  if (Number(r.settingsVersion) >= 2) return r;
  const d = DEFAULT_IMPORT_SETTINGS;
  const union = (a: unknown, b: string[]) => [...new Set([...list(a), ...b])];
  const sameAs = (a: unknown, b: string[]) => JSON.stringify(list(a)) === JSON.stringify(b);
  return {
    ...r,
    enabledSources: union(r.enabledSources, ["TRUDVSEM", "HACKERNEWS", "LEVER", "SMARTRECRUITERS"]),
    greenhouseBoards: !list(r.greenhouseBoards).length || sameAs(r.greenhouseBoards, OLD_GREENHOUSE) ? d.greenhouseBoards : union(r.greenhouseBoards, d.greenhouseBoards),
    ashbyBoards: !list(r.ashbyBoards).length || sameAs(r.ashbyBoards, OLD_ASHBY) ? d.ashbyBoards : union(r.ashbyBoards, d.ashbyBoards),
    leverCompanies: union(r.leverCompanies, d.leverCompanies),
    smartrecruitersCompanies: d.smartrecruitersCompanies,
    maxPerSource: Number(r.maxPerSource) <= 300 ? d.maxPerSource : r.maxPerSource,
    maxAgeDays: Number(r.maxAgeDays) <= 30 ? d.maxAgeDays : r.maxAgeDays,
    settingsVersion: 2,
  };
}

/** Приводит произвольный JSON к валидным настройкам, неизвестное отбрасывает. */
export function normalizeImportSettings(raw: unknown): ImportSettings {
  const r = upgrade((raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>);
  const d = DEFAULT_IMPORT_SETTINGS;
  return {
    enabledSources: Array.isArray(r.enabledSources)
      ? (r.enabledSources.filter((s): s is string => typeof s === "string").filter(isImportSource) as VacancySource[])
      : d.enabledSources,
    requireSalary: typeof r.requireSalary === "boolean" ? r.requireSalary : d.requireSalary,
    remoteOnly: typeof r.remoteOnly === "boolean" ? r.remoteOnly : d.remoteOnly,
    languages: Array.isArray(r.languages) ? list(r.languages).map((l) => l.toLowerCase().slice(0, 2)) : d.languages,
    maxPerSource: clampInt(r.maxPerSource, 10, 5000, d.maxPerSource),
    maxAgeDays: clampInt(r.maxAgeDays, 1, 365, d.maxAgeDays),
    autoPublish: typeof r.autoPublish === "boolean" ? r.autoPublish : d.autoPublish,
    greenhouseBoards: Array.isArray(r.greenhouseBoards) ? list(r.greenhouseBoards) : d.greenhouseBoards,
    leverCompanies: Array.isArray(r.leverCompanies) ? list(r.leverCompanies) : d.leverCompanies,
    ashbyBoards: Array.isArray(r.ashbyBoards) ? list(r.ashbyBoards) : d.ashbyBoards,
    smartrecruitersCompanies: Array.isArray(r.smartrecruitersCompanies) ? list(r.smartrecruitersCompanies) : d.smartrecruitersCompanies,
    settingsVersion: 2,
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
