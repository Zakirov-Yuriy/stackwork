import "server-only";
import { db } from "@/lib/db";
import { siteUrl } from "@/lib/mail";
import { answerCallback, esc, isChannelMember, sendMessage, type InlineKeyboard } from "./api";
import { formatVacancyPost, VACANCY_FOR_POST } from "./post";
import { getTelegramSettings, type TelegramSettings } from "./settings";

/**
 * Логика бота. Кнопка «Открыть вакансию» под постом ведёт на t.me/<bot>?start=v_<id>.
 * Подписчику канала бот отдаёт ссылки на вакансию и отклик, остальным предлагает подписаться
 * и нажать «Проверить». Тексты на русском и английском по языку Telegram пользователя.
 */

type User = { id: number; language_code?: string };
type Message = { message_id: number; from?: User; chat: { id: number; type: string }; text?: string };
type CallbackQuery = { id: string; from: User; data?: string; message?: Message };
export type Update = { update_id: number; message?: Message; callback_query?: CallbackQuery };

const T = {
  ru: {
    welcome: (site: string, channel: string) =>
      `Привет! Это бот <b>Stackwork</b>, IT-вакансий с указанной зарплатой.\n\nНовые вакансии каждый день в канале ${channel}. Нажмите «Открыть вакансию» под постом, и я пришлю ссылку.\n\nВсе вакансии: ${site}`,
    gate: (channel: string) => `Чтобы открыть вакансию, подпишитесь на канал ${channel} и нажмите «Проверить подписку».`,
    stillNot: "Пока не вижу подписки. Подпишитесь на канал и нажмите ещё раз.",
    subscribe: "Подписаться на канал",
    check: "Проверить подписку",
    page: "Страница вакансии",
    apply: "Откликнуться",
    notFound: "Эта вакансия уже закрыта или снята с публикации.",
    unlocked: "Вот вакансия. Удачи на собеседовании!",
  },
  en: {
    welcome: (site: string, channel: string) =>
      `Hi! This is the <b>Stackwork</b> bot: IT jobs with the salary shown.\n\nNew jobs every day in ${channel}. Press “Open job” under a post and I will send you the link.\n\nAll jobs: ${site}`,
    gate: (channel: string) => `To open this job, subscribe to ${channel} and press “Check subscription”.`,
    stillNot: "I can't see your subscription yet. Subscribe to the channel and try again.",
    subscribe: "Subscribe to the channel",
    check: "Check subscription",
    page: "Job page",
    apply: "Apply",
    notFound: "This job is already closed or unpublished.",
    unlocked: "Here is the job. Good luck with the interview!",
  },
};

function lang(user?: User): keyof typeof T {
  return user?.language_code?.toLowerCase().startsWith("ru") ? "ru" : "en";
}

function channelLink(s: TelegramSettings): string {
  return s.channel.startsWith("@") ? `https://t.me/${s.channel.slice(1)}` : s.channel;
}

function channelName(s: TelegramSettings): string {
  return s.channel.startsWith("@") ? s.channel : "Stackwork";
}

async function sendVacancy(chatId: number, vacancyId: string, l: keyof typeof T): Promise<void> {
  const v = await db.vacancy.findFirst({ where: { id: vacancyId, status: "PUBLISHED" }, select: VACANCY_FOR_POST });
  if (!v) {
    await sendMessage(chatId, T[l].notFound);
    return;
  }
  const page = siteUrl(`/vacancies/${v.slug}?from=telegram`);
  const apply = v.source === "MANUAL" ? `${page}#respond` : v.applyUrl || page;
  const keyboard: InlineKeyboard = [[{ text: T[l].page, url: page }], [{ text: T[l].apply, url: apply }]];
  await sendMessage(chatId, `${formatVacancyPost(v)}\n\n${esc(T[l].unlocked)}`, keyboard);
  await db.telegramPost.updateMany({ where: { vacancyId }, data: { unlocked: { increment: 1 } } });
}

async function sendGate(chatId: number, vacancyId: string, l: keyof typeof T, s: TelegramSettings): Promise<void> {
  const keyboard: InlineKeyboard = [[{ text: T[l].subscribe, url: channelLink(s) }], [{ text: T[l].check, callback_data: `chk_${vacancyId}` }]];
  await sendMessage(chatId, T[l].gate(channelName(s)), keyboard);
}

async function handleStart(msg: Message, payload: string, s: TelegramSettings): Promise<void> {
  const l = lang(msg.from);
  const chatId = msg.chat.id;
  const m = /^v_([a-z0-9]+)$/i.exec(payload);
  if (!m || !msg.from) {
    await sendMessage(chatId, T[l].welcome(siteUrl("/"), channelName(s)));
    return;
  }
  const vacancyId = m[1];
  await db.telegramPost.updateMany({ where: { vacancyId }, data: { clicks: { increment: 1 } } });
  if (await isChannelMember(s.channel, msg.from.id)) await sendVacancy(chatId, vacancyId, l);
  else await sendGate(chatId, vacancyId, l, s);
}

async function handleCallback(cb: CallbackQuery, s: TelegramSettings): Promise<void> {
  const l = lang(cb.from);
  const m = /^chk_([a-z0-9]+)$/i.exec(cb.data ?? "");
  const chatId = cb.message?.chat.id;
  if (!m || !chatId) {
    await answerCallback(cb.id);
    return;
  }
  if (await isChannelMember(s.channel, cb.from.id)) {
    await answerCallback(cb.id);
    await sendVacancy(chatId, m[1], l);
  } else {
    await answerCallback(cb.id, T[l].stillNot, true);
  }
}

/** Обработка одного update от Telegram. Ошибки глотаем: Telegram иначе будет повторять доставку. */
export async function handleUpdate(update: Update): Promise<void> {
  const s = await getTelegramSettings();
  try {
    if (update.message?.text && update.message.chat.type === "private") {
      const text = update.message.text.trim();
      const start = /^\/start(?:@\w+)?(?:\s+(\S+))?$/.exec(text);
      if (start) await handleStart(update.message, start[1] ?? "", s);
      else await sendMessage(update.message.chat.id, T[lang(update.message.from)].welcome(siteUrl("/"), channelName(s)));
    } else if (update.callback_query) {
      await handleCallback(update.callback_query, s);
    }
  } catch (e) {
    console.error("[telegram] update failed:", e instanceof Error ? e.message : e);
  }
}
