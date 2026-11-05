import "server-only";
import { db } from "@/lib/db";
import { siteUrl } from "@/lib/mail";

/**
 * Нейросеть через OpenRouter: дописывает связный текст статьи поверх цифр и выводов.
 * Ключ в OPENROUTER_API_KEY, модель в настройках (ключ Setting «content»).
 * Правило: нейросеть не добавляет фактов, только пересказывает данные; цифры в таблицах остаются как есть.
 */

export type ContentSettings = { model: string };
export const DEFAULT_CONTENT_SETTINGS: ContentSettings = { model: "openai/gpt-4o-mini" };
const KEY = "content";

export async function getContentSettings(): Promise<ContentSettings> {
  const row = await db.setting.findUnique({ where: { key: KEY } });
  const r = (row?.value && typeof row.value === "object" ? row.value : {}) as Record<string, unknown>;
  return { model: typeof r.model === "string" && r.model.trim() ? r.model.trim() : DEFAULT_CONTENT_SETTINGS.model };
}

export async function saveContentSettings(patch: Partial<ContentSettings>): Promise<void> {
  const value = { ...(await getContentSettings()), ...patch };
  await db.setting.upsert({ where: { key: KEY }, create: { key: KEY, value }, update: { value } });
}

export function isLlmConfigured(): boolean {
  return Boolean(process.env.OPENROUTER_API_KEY);
}

const SYSTEM = `Ты редактор аналитических материалов о рынке IT-вакансий. Пишешь по-русски, для Хабра и vc.ru: спокойно, конкретно, без воды, без восклицаний, без обращений к читателю, без слов «уникальный», «революционный», «в современном мире».
Правила:
1. Используй только факты и цифры из переданных данных. Ничего не придумывай, не округляй иначе, чем дано, не добавляй внешних сравнений и источников.
2. Таблицы, ссылки на картинки и ссылки на страницы переноси в текст как есть, без изменений.
3. Структура: заголовок первого уровня как дан, короткое вступление (2–3 абзаца), затем разделы по порядку исходных данных, у каждого 1–2 абзаца с выводами перед таблицей. Раздел «Методика» оставь как в исходнике.
4. Тире в тексте: обычное «–» между цифрами и как знак в предложениях не используй, пиши запятые и точки с запятой. Знак «→» не используй.
5. Объём: 700–1100 слов без учёта таблиц. Markdown.`;

/** Возвращает текст статьи от нейросети. Бросает ошибку с понятным текстом. */
export async function writeArticleWithLlm(dataMarkdown: string, facts: string[], model: string): Promise<string> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY не задан");
  const user = `Обязательные выводы (каждый должен быть в тексте):\n${facts.map((f) => `- ${f}`).join("\n")}\n\nИсходные данные и таблицы:\n\n${dataMarkdown}`;
  const base = process.env.OPENROUTER_API_BASE ?? "https://openrouter.ai/api/v1";
  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "HTTP-Referer": siteUrl("/"), "X-Title": "Stackwork" },
    body: JSON.stringify({ model, temperature: 0.4, max_tokens: 6000, messages: [{ role: "system", content: SYSTEM }, { role: "user", content: user }] }),
    signal: AbortSignal.timeout(150_000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`OpenRouter ответил ${res.status}: ${body.slice(0, 300)}`);
  }
  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }>; error?: { message?: string } };
  const text = json.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error(json.error?.message ?? "пустой ответ модели");
  return text;
}
