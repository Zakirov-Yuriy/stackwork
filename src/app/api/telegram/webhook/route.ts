import { NextResponse } from "next/server";
import { webhookSecret } from "@/lib/telegram/api";
import { handleUpdate, type Update } from "@/lib/telegram/bot";

/**
 * Вебхук бота. Telegram подписывает запросы заголовком X-Telegram-Bot-Api-Secret-Token,
 * секрет задаётся при setWebhook (кнопка «Подключить бота» в админке).
 */
export const maxDuration = 30;

export async function POST(request: Request) {
  if (request.headers.get("x-telegram-bot-api-secret-token") !== webhookSecret()) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const update = (await request.json().catch(() => null)) as Update | null;
  if (!update) return NextResponse.json({ ok: false }, { status: 400 });
  await handleUpdate(update);
  return NextResponse.json({ ok: true });
}
