import "server-only";
import { db } from "@/lib/db";
import { siteUrl } from "@/lib/mail";
import { makeLabels, CURRENCY_SIGN } from "@/lib/labels";
import { esc, isTelegramConfigured, sendMessage, TelegramError } from "@/lib/telegram/api";
import { getTelegramSettings, saveTelegramSettings, type TelegramSettings } from "@/lib/telegram/settings";
import { lastWeek, periodStats, previousPeriod, delta, deltaText, type PeriodStats, type Period } from "./stats";
import type { SalaryStat } from "@/lib/landing";

/**
 * Еженедельный дайджест для канала: новые вакансии за неделю, стек недели с медианами,
 * самые высокие вилки, компании. Собирается из базы, без нейросети. Картинка-карточка
 * подтягивается превью ссылки (/api/og/digest/<неделя>.png).
 */

const L = makeLabels("ru");

export type Digest = { period: Period; stats: PeriodStats; prev: PeriodStats; html: string; title: string };

function stat(s: SalaryStat | null): string {
  if (!s) return "";
  return `${L.nf.format(s.median)} ${CURRENCY_SIGN[s.currency] ?? s.currency}${s.period === "YEAR" ? " в год" : ""}`;
}

function vacancyLink(v: { id: string; slug: string }, settings: TelegramSettings): string {
  return settings.linkMode === "bot" && settings.botUsername ? `https://t.me/${settings.botUsername}?start=v_${v.id}` : siteUrl(`/vacancies/${v.slug}?from=digest`);
}

export function formatDigest(stats: PeriodStats, prev: PeriodStats, settings: TelegramSettings): string {
  const share = (n: number) => (stats.total ? Math.round((n / stats.total) * 100) : 0);
  const d = delta(stats.total, prev.total);
  const lines: string[] = [];
  lines.push(`<b>📊 Итоги недели на Stackwork, ${esc(stats.period.label)}</b>`);
  lines.push("");
  lines.push(esc(`Новых вакансий: ${L.nf.format(stats.total)}${d !== null ? ` (${deltaText(d)} к прошлой неделе)` : ""}, с указанной зарплатой ${share(stats.withSalary)}%, удалённых ${share(stats.remote)}%.`));
  if (stats.stacks.length) {
    lines.push("");
    lines.push("<b>Стек недели</b> (новых вакансий · медиана)");
    for (const s of stats.stacks.slice(0, 6)) {
      const med = [stat(s.salary), s.salaryRub && s.salary?.currency !== "RUB" ? stat(s.salaryRub) : ""].filter(Boolean).join(" / ");
      lines.push(`• <a href="${siteUrl(`/jobs/${s.slug}`)}">${esc(s.name)}</a>: ${s.count}${med ? ` · ${esc(med)}` : ""}`);
    }
  }
  if (stats.topPaid.length) {
    lines.push("");
    lines.push("<b>Самые высокие вилки недели</b>");
    stats.topPaid.slice(0, 5).forEach((v, i) => {
      const salary = `${L.formatSalary(v.salaryFrom, v.salaryTo, v.currency)}${L.periodSuffix(v.salaryPeriod, true)}`;
      lines.push(`${i + 1}. <a href="${vacancyLink(v, settings)}">${esc(v.title)}</a>, ${esc(v.company)}: ${esc(salary)}`);
    });
  }
  if (stats.companies.length) {
    lines.push("");
    lines.push(esc(`Больше всего новых вакансий: ${stats.companies.slice(0, 3).map((c) => `${c.name} (${c.count})`).join(", ")}.`));
  }
  lines.push("");
  lines.push(`<a href="${siteUrl("/salaries")}">Зарплаты по стеку</a> · <a href="${siteUrl("/jobs")}">Вакансии по технологиям</a>`);
  return lines.join("\n");
}

export async function buildDigest(now = new Date()): Promise<Digest> {
  const period = lastWeek(now);
  const [stats, prev, settings] = await Promise.all([periodStats(period, { stacks: 6, topPaid: 5, companies: 3 }), periodStats(previousPeriod(period), { stacks: 1, topPaid: 1, companies: 1 }), getTelegramSettings()]);
  return { period, stats, prev, html: formatDigest(stats, prev, settings), title: `Итоги недели, ${period.label}` };
}

export function digestImageUrl(period: Period): string {
  return siteUrl(`/api/og/digest/${period.key}.png`);
}

/** Отправляет дайджест в канал и сохраняет черновик. Возвращает ошибку текстом или null. */
export async function sendDigest(opts: { force?: boolean; now?: Date } = {}): Promise<{ sent: boolean; error: string | null; draftId?: string }> {
  const settings = await getTelegramSettings();
  if (!settings.digestEnabled && !opts.force) return { sent: false, error: "дайджест выключен" };
  if (!isTelegramConfigured()) return { sent: false, error: "TELEGRAM_BOT_TOKEN не задан" };
  const digest = await buildDigest(opts.now);
  if (digest.stats.total === 0) return { sent: false, error: "за неделю нет новых вакансий" };
  // Один дайджест на неделю: повторный запуск крона не должен дублировать пост
  const existing = await db.contentDraft.findFirst({ where: { kind: "DIGEST", period: digest.period.key, sentAt: { not: null } }, select: { id: true } });
  if (existing && !opts.force) return { sent: false, error: "дайджест за эту неделю уже отправлен", draftId: existing.id };
  const preview = /^https:\/\//.test(siteUrl("/")) ? { link_preview_options: { url: digestImageUrl(digest.period), prefer_large_media: true, show_above_text: true } } : {};
  let error: string | null = null;
  let messageId: number | null = null;
  try {
    let sent;
    try {
      sent = await sendMessage(settings.channel, digest.html, undefined, preview);
    } catch (e) {
      if (!(e instanceof TelegramError) || e.code === 429) throw e;
      sent = await sendMessage(settings.channel, digest.html);
    }
    messageId = sent.message_id;
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }
  const draft = await db.contentDraft.create({
    data: { kind: "DIGEST", period: digest.period.key, title: digest.title, markdown: digest.html, data: JSON.parse(JSON.stringify({ stats: digest.stats, prev: { total: digest.prev.total } })), sentAt: error ? null : new Date(), messageId },
    select: { id: true },
  });
  await saveTelegramSettings({ lastDigest: { at: new Date().toISOString(), error } });
  return { sent: !error, error, draftId: draft.id };
}
