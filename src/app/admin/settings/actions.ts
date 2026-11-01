"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/session";
import { saveImportSettings, normalizeImportSettings } from "@/lib/import/settings";
import { isImportSource } from "@/lib/import/sources";
import type { VacancySource } from "@/generated/prisma/client";
import { siteUrl } from "@/lib/mail";
import { getMe, isTelegramConfigured, setWebhook, tg } from "@/lib/telegram/api";
import { getTelegramSettings, saveTelegramSettings } from "@/lib/telegram/settings";
import { postPendingVacancies } from "@/lib/telegram/post";

function lines(v: FormDataEntryValue | null): string[] {
  return String(v ?? "")
    .split(/[\n,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function saveImportSettingsAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/forbidden");

  const next = normalizeImportSettings({
    enabledSources: formData.getAll("enabledSources").map(String),
    requireSalary: formData.get("requireSalary") === "on",
    remoteOnly: formData.get("remoteOnly") === "on",
    languages: lines(formData.get("languages")),
    maxPerSource: Number(formData.get("maxPerSource")),
    maxAgeDays: Number(formData.get("maxAgeDays")),
    autoPublish: formData.get("autoPublish") === "on",
    greenhouseBoards: lines(formData.get("greenhouseBoards")),
    leverCompanies: lines(formData.get("leverCompanies")),
    ashbyBoards: lines(formData.get("ashbyBoards")),
  });
  await saveImportSettings(next);
  revalidatePath("/admin/settings");
  revalidatePath("/admin/import");
  redirect("/admin/settings?saved=1");
}

// ───────────────────────────── Telegram ─────────────────────────────

export async function saveTelegramSettingsAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/forbidden");
  await saveTelegramSettings({
    enabled: formData.get("enabled") === "on",
    channel: String(formData.get("channel") ?? ""),
    dailyLimit: Number(formData.get("dailyLimit")),
    salaryFirst: formData.get("salaryFirst") === "on",
    postEmployer: formData.get("postEmployer") === "on",
    sources: formData.getAll("tgSources").map(String).filter(isImportSource) as VacancySource[],
  });
  revalidatePath("/admin/settings");
  redirect("/admin/settings?saved=1#telegram");
}

/** Проверяет токен, запоминает username бота, ставит вебхук и проверяет права в канале */
export async function connectTelegramAction() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/forbidden");
  if (!isTelegramConfigured()) redirect(`/admin/settings?tg=${encodeURIComponent("Сначала добавьте TELEGRAM_BOT_TOKEN в переменные окружения и перезапустите деплой")}#telegram`);
  let message: string;
  try {
    const me = await getMe();
    const s = await getTelegramSettings();
    await setWebhook(siteUrl("/api/telegram/webhook"));
    const member = await tg<{ status: string; can_post_messages?: boolean }>("getChatMember", { chat_id: s.channel, user_id: me.id });
    const canPost = member.status === "creator" || (member.status === "administrator" && member.can_post_messages !== false);
    await saveTelegramSettings({ botUsername: me.username, connectedAt: new Date().toISOString() });
    message = canPost
      ? `Бот @${me.username} подключён, вебхук установлен, права на публикацию в ${s.channel} есть`
      : `Бот @${me.username} подключён, но в канале ${s.channel} у него нет права публиковать сообщения: добавьте его в администраторы канала`;
  } catch (e) {
    message = `Не удалось подключить бота: ${e instanceof Error ? e.message : String(e)}`;
  }
  revalidatePath("/admin/settings");
  redirect(`/admin/settings?tg=${encodeURIComponent(message)}#telegram`);
}

/** Отправить в канал вакансии, ожидающие публикации, в пределах дневного лимита */
export async function postToTelegramNowAction() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/forbidden");
  const r = await postPendingVacancies({ force: true });
  const message = r.error && !r.sent ? `Не отправлено: ${r.error}` : `Отправлено ${r.sent} из ${r.candidates} ожидающих, лимит на сегодня остался ${r.limitLeft}${r.error ? `, последняя ошибка: ${r.error}` : ""}`;
  revalidatePath("/admin/settings");
  redirect(`/admin/settings?tg=${encodeURIComponent(message)}#telegram`);
}
