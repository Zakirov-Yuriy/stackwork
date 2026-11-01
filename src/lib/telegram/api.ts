import "server-only";
import { createHash } from "node:crypto";

/**
 * Тонкая обёртка над Bot API Telegram. Токен бота в TELEGRAM_BOT_TOKEN (выдаёт @BotFather).
 * Секрет вебхука выводится из CRON_SECRET, отдельная переменная не нужна.
 */

export function botToken(): string | null {
  const t = process.env.TELEGRAM_BOT_TOKEN?.trim();
  return t && /^\d+:[\w-]{20,}$/.test(t) ? t : null;
}

export function isTelegramConfigured(): boolean {
  return botToken() !== null;
}

/** Секрет, который Telegram присылает в заголовке X-Telegram-Bot-Api-Secret-Token */
export function webhookSecret(): string {
  const base = process.env.CRON_SECRET ?? process.env.SESSION_SECRET ?? "stackwork";
  return createHash("sha256").update(`telegram-webhook:${base}`).digest("hex").slice(0, 48);
}

export class TelegramError extends Error {
  constructor(
    message: string,
    public readonly code?: number,
    public readonly retryAfter?: number,
  ) {
    super(message);
  }
}

type ApiResponse<T> = { ok: true; result: T } | { ok: false; description?: string; error_code?: number; parameters?: { retry_after?: number } };

export async function tg<T = unknown>(method: string, body?: Record<string, unknown>): Promise<T> {
  const token = botToken();
  if (!token) throw new TelegramError("TELEGRAM_BOT_TOKEN не задан");
  // TELEGRAM_API_BASE нужен только автотестам (подменный сервер вместо api.telegram.org)
  const base = process.env.TELEGRAM_API_BASE?.replace(/\/$/, "") || "https://api.telegram.org";
  const res = await fetch(`${base}/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
    cache: "no-store",
  });
  const data = (await res.json().catch(() => null)) as ApiResponse<T> | null;
  if (!data) throw new TelegramError(`Telegram ${method}: пустой ответ, HTTP ${res.status}`);
  if (!data.ok) throw new TelegramError(`Telegram ${method}: ${data.description ?? "ошибка"}`, data.error_code, data.parameters?.retry_after);
  return data.result;
}

export type InlineKeyboard = Array<Array<{ text: string; url?: string; callback_data?: string }>>;

export type SentMessage = { message_id: number; chat: { id: number } };

export async function sendMessage(chatId: string | number, text: string, keyboard?: InlineKeyboard, extra: Record<string, unknown> = {}): Promise<SentMessage> {
  return tg<SentMessage>("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    link_preview_options: { is_disabled: true },
    ...(keyboard ? { reply_markup: { inline_keyboard: keyboard } } : {}),
    ...extra,
  });
}

/** Пост с картинкой: подпись до 1024 символов, те же кнопки */
export async function sendPhoto(chatId: string | number, photo: string, caption: string, keyboard?: InlineKeyboard): Promise<SentMessage> {
  return tg<SentMessage>("sendPhoto", {
    chat_id: chatId,
    photo,
    caption: caption.slice(0, 1024),
    parse_mode: "HTML",
    ...(keyboard ? { reply_markup: { inline_keyboard: keyboard } } : {}),
  });
}

export async function deleteMessage(chatId: string | number, messageId: number): Promise<void> {
  await tg("deleteMessage", { chat_id: chatId, message_id: messageId });
}

export type BotInfo = { id: number; username: string; first_name: string };

export async function getMe(): Promise<BotInfo> {
  return tg<BotInfo>("getMe");
}

type ChatMember = { status: "creator" | "administrator" | "member" | "restricted" | "left" | "kicked" };

/** Подписан ли пользователь на канал. Бот должен быть администратором канала. */
export async function isChannelMember(channel: string, userId: number): Promise<boolean> {
  try {
    const m = await tg<ChatMember>("getChatMember", { chat_id: channel, user_id: userId });
    return m.status === "creator" || m.status === "administrator" || m.status === "member" || m.status === "restricted";
  } catch (e) {
    // «user not found» и подобное: считаем, что не подписан
    if (e instanceof TelegramError && e.code === 400) return false;
    throw e;
  }
}

export async function answerCallback(callbackId: string, text?: string, alert = false): Promise<void> {
  await tg("answerCallbackQuery", { callback_query_id: callbackId, ...(text ? { text, show_alert: alert } : {}) });
}

export async function setWebhook(url: string): Promise<void> {
  await tg("setWebhook", { url, secret_token: webhookSecret(), allowed_updates: ["message", "callback_query"], drop_pending_updates: true });
}

export type WebhookInfo = { url: string; pending_update_count: number; last_error_message?: string; last_error_date?: number };

export async function getWebhookInfo(): Promise<WebhookInfo> {
  return tg<WebhookInfo>("getWebhookInfo");
}

/** Экранирование для parse_mode=HTML */
export function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
