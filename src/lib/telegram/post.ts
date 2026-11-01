import "server-only";
import { db } from "@/lib/db";
import type { Prisma, VacancySource } from "@/generated/prisma/client";
import { siteUrl } from "@/lib/mail";
import { makeLabels } from "@/lib/labels";
import { deleteMessage, esc, isTelegramConfigured, sendMessage, sendPhoto, TelegramError, type InlineKeyboard } from "./api";
import { getTelegramSettings, saveTelegramSettings, type TelegramSettings } from "./settings";

/**
 * Публикация вакансий в канал. Один пост на вакансию, не больше dailyLimit в сутки,
 * сначала с зарплатой. Кнопка «Открыть вакансию» ведёт в бота (t.me/<bot>?start=v_<id>),
 * который выдаёт ссылку только подписчикам канала.
 */

const L = makeLabels("ru");

export const VACANCY_FOR_POST = {
  id: true,
  slug: true,
  title: true,
  source: true,
  grade: true,
  workFormat: true,
  employment: true,
  city: true,
  locationNote: true,
  salaryFrom: true,
  salaryTo: true,
  currency: true,
  salaryPeriod: true,
  salaryType: true,
  applyUrl: true,
  publishedAt: true,
  company: { select: { name: true } },
  skills: { orderBy: { order: "asc" as const }, take: 8, select: { skill: { select: { name: true } } } },
} satisfies Prisma.VacancySelect;

export type VacancyForPost = Prisma.VacancyGetPayload<{ select: typeof VACANCY_FOR_POST }>;

const SOURCE_NAME: Record<VacancySource, string> = {
  MANUAL: "",
  REMOTIVE: "Remotive",
  JOBICY: "Jobicy",
  REMOTEOK: "Remote OK",
  HIMALAYAS: "Himalayas",
  ARBEITNOW: "Arbeitnow",
  GREENHOUSE: "сайт работодателя",
  LEVER: "сайт работодателя",
  ASHBY: "сайт работодателя",
};

/** Текст карточки для канала (HTML). Без ссылок на отклик: их выдаёт бот. */
export function formatVacancyPost(v: VacancyForPost): string {
  const hasSalary = Boolean(v.salaryFrom || v.salaryTo);
  const salary = hasSalary ? `${L.formatSalary(v.salaryFrom, v.salaryTo, v.currency)}${L.periodSuffix(v.salaryPeriod, true)}${v.source === "MANUAL" ? ` ${L.SALARY_TYPE_LABEL[v.salaryType]}` : ""}` : "";
  const skills = v.skills.map((s) => s.skill.name).filter(Boolean);
  const lines = [
    `<b>${esc(v.title)}</b>`,
    esc(`${v.company.name} · ${L.formatLocation(v.city, v.workFormat, v.locationNote)}`),
    salary ? `💰 ${esc(salary)}` : "",
    skills.length ? `🧰 ${esc(skills.join(", "))}` : "",
    esc(`${L.GRADE_LABEL[v.grade]} · ${L.EMPLOYMENT_LABEL[v.employment]}`),
    v.source !== "MANUAL" && SOURCE_NAME[v.source] ? `<i>${esc(`Источник: ${SOURCE_NAME[v.source]}`)}</i>` : "",
  ];
  return lines.filter(Boolean).join("\n");
}

/**
 * Кнопки под постом. Режим direct: «Открыть на сайте» и «Откликнуться» (через /apply, чтобы считать переходы).
 * Режим bot: одна кнопка в бота, ссылку получают только подписчики канала.
 */
export function postKeyboard(v: Pick<VacancyForPost, "id" | "slug">, settings: TelegramSettings): InlineKeyboard {
  if (settings.linkMode === "bot" && settings.botUsername) {
    return [[{ text: "Открыть вакансию", url: `https://t.me/${settings.botUsername}?start=v_${v.id}` }]];
  }
  return [
    [
      { text: "Открыть на сайте", url: siteUrl(`/vacancies/${v.slug}?from=telegram`) },
      { text: "Откликнуться", url: siteUrl(`/apply/${v.slug}?from=telegram`) },
    ],
  ];
}

/** Картинка поста: карточка вакансии, которую Telegram забирает с нашего сайта */
export function postImageUrl(v: Pick<VacancyForPost, "slug">): string {
  return siteUrl(`/api/og/vacancy/${v.slug}.png`);
}

/** Начало текущих суток по Москве (лимит постов считается по московскому дню) */
function mskDayStart(now = new Date()): Date {
  const msk = new Date(now.getTime() + 3 * 3_600_000);
  return new Date(Date.UTC(msk.getUTCFullYear(), msk.getUTCMonth(), msk.getUTCDate()) - 3 * 3_600_000);
}

export async function postedToday(): Promise<number> {
  return db.telegramPost.count({ where: { postedAt: { gte: mskDayStart() } } });
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Отправляет одну вакансию в канал и записывает пост. Возвращает ошибку текстом или null. */
export async function postVacancy(v: VacancyForPost, settings?: TelegramSettings): Promise<string | null> {
  const s = settings ?? (await getTelegramSettings());
  if (!isTelegramConfigured()) return "TELEGRAM_BOT_TOKEN не задан";
  const already = await db.telegramPost.findUnique({ where: { vacancyId: v.id }, select: { id: true } });
  if (already) return null;
  try {
    const text = formatVacancyPost(v);
    const keyboard = postKeyboard(v, s);
    let sent;
    if (s.withImage && /^https:\/\//.test(siteUrl("/"))) {
      // Telegram сам скачивает картинку по адресу; если не смог, шлём текстом
      try {
        sent = await sendPhoto(s.channel, postImageUrl(v), text, keyboard);
      } catch (e) {
        if (!(e instanceof TelegramError) || e.code === 429) throw e;
        sent = await sendMessage(s.channel, text, keyboard);
      }
    } else {
      sent = await sendMessage(s.channel, text, keyboard);
    }
    await db.telegramPost.create({ data: { vacancyId: v.id, chatId: s.channel, messageId: sent.message_id } });
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
}

export type PostRunSummary = { sent: number; candidates: number; limitLeft: number; error?: string };

/**
 * Постит ещё не опубликованные в канале вакансии: свежие (до 7 дней), из разрешённых источников,
 * в пределах дневного лимита. Вызывается после импорта и кнопкой в админке.
 */
export async function postPendingVacancies(opts: { force?: boolean; max?: number; deadline?: number } = {}): Promise<PostRunSummary> {
  const s = await getTelegramSettings();
  if (!s.enabled && !opts.force) return { sent: 0, candidates: 0, limitLeft: 0, error: "постинг выключен" };
  if (!isTelegramConfigured()) return { sent: 0, candidates: 0, limitLeft: 0, error: "TELEGRAM_BOT_TOKEN не задан" };

  const limitLeft = Math.max(0, s.dailyLimit - (await postedToday()));
  const max = Math.min(limitLeft, opts.max ?? limitLeft);
  const sources: VacancySource[] = [...s.sources, ...(s.postEmployer ? (["MANUAL"] as VacancySource[]) : [])];
  const since = new Date(Date.now() - 7 * 86_400_000);
  const where = { status: "PUBLISHED" as const, telegramPost: null, source: { in: sources }, publishedAt: { gte: since } };
  const [pending, candidates] = await Promise.all([
    db.vacancy.count({ where }),
    db.vacancy.findMany({ where, select: VACANCY_FOR_POST, orderBy: { publishedAt: "desc" }, take: 200 }),
  ]);
  if (s.salaryFirst) {
    candidates.sort((a, b) => Number(Boolean(b.salaryFrom || b.salaryTo)) - Number(Boolean(a.salaryFrom || a.salaryTo)) || (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0));
  }

  let sent = 0;
  let error: string | undefined;
  let failures = 0;
  for (const v of candidates.slice(0, max)) {
    // Лимит времени функции на Vercel: недосланное уйдёт следующим запуском
    if (opts.deadline && Date.now() > opts.deadline) break;
    const problem = await postVacancy(v, s);
    if (problem) {
      failures++;
      error = problem;
      // Лимит Telegram: подождать, сколько просит, и продолжить; другие ошибки: три подряд и стоп
      const retry = /retry after (\d+)/i.exec(problem);
      if (retry) await sleep((Number(retry[1]) + 1) * 1000);
      else if (failures >= 3) break;
      continue;
    }
    sent++;
    failures = 0;
    // Бот может слать в канал не чаще ~20 сообщений в минуту
    await sleep(3200);
  }
  await saveTelegramSettings({ lastRun: { at: new Date().toISOString(), sent, error: error ?? null } });
  return { sent, candidates: pending, limitLeft: Math.max(0, limitLeft - sent), ...(error ? { error } : {}) };
}

/**
 * Удаляет из канала все посты, отправленные ботом, и забывает о них: после этого вакансии
 * снова считаются неопубликованными и уйдут в канал заново (уже с картинками, новыми кнопками и т. п.).
 */
export async function deleteAllPosts(): Promise<{ deleted: number; failed: number }> {
  const posts = await db.telegramPost.findMany({ select: { id: true, chatId: true, messageId: true } });
  let deleted = 0;
  let failed = 0;
  for (const p of posts) {
    if (p.messageId) {
      try {
        await deleteMessage(p.chatId, p.messageId);
        deleted++;
      } catch (e) {
        failed++;
        const retry = e instanceof TelegramError ? e.retryAfter : undefined;
        if (retry) await sleep((retry + 1) * 1000);
      }
      await sleep(150);
    }
  }
  await db.telegramPost.deleteMany({});
  return { deleted, failed };
}

export { TelegramError };
