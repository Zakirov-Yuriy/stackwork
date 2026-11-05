"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/session";
import { db } from "@/lib/db";
import { sendDigest } from "@/lib/content/digest";
import { buildArticle, saveArticleDraft } from "@/lib/content/article";
import { getContentSettings, saveContentSettings, writeArticleWithLlm } from "@/lib/content/llm";
import { saveTelegramSettings } from "@/lib/telegram/settings";

async function admin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/forbidden");
}

function back(message: string, month?: string): never {
  revalidatePath("/admin/content");
  redirect(`/admin/content?msg=${encodeURIComponent(message)}${month ? `&month=${month}` : ""}`);
}

export async function sendDigestNowAction() {
  await admin();
  const r = await sendDigest({ force: true });
  back(r.sent ? "Дайджест отправлен в канал" : `Не отправлено: ${r.error}`);
}

export async function toggleDigestAction(formData: FormData) {
  await admin();
  const enabled = formData.get("digestEnabled") === "on";
  await saveTelegramSettings({ digestEnabled: enabled });
  back(enabled ? "Дайджест будет уходить в канал по понедельникам" : "Автоматический дайджест выключен");
}

export async function buildArticleAction(formData: FormData) {
  await admin();
  const month = String(formData.get("month") ?? "");
  const a = await buildArticle(month);
  if (!a) back("Не понял месяц", month);
  if (!a.stats.total) back(`За ${a.period.label} нет вакансий`, month);
  await saveArticleDraft(a);
  back(`Заготовка за ${a.period.label} собрана из данных`, month);
}

export async function writeArticleAction(formData: FormData) {
  await admin();
  const month = String(formData.get("month") ?? "");
  const a = await buildArticle(month);
  if (!a) back("Не понял месяц", month);
  if (!a.stats.total) back(`За ${a.period.label} нет вакансий`, month);
  const { model } = await getContentSettings();
  try {
    const text = await writeArticleWithLlm(a.markdown, a.facts, model);
    await saveArticleDraft(a, text, model);
  } catch (e) {
    back(`Не удалось написать текст: ${e instanceof Error ? e.message : String(e)}`, month);
  }
  back(`Текст за ${a.period.label} написан моделью ${model}, проверьте перед публикацией`, month);
}

export async function saveContentSettingsAction(formData: FormData) {
  await admin();
  await saveContentSettings({ model: String(formData.get("model") ?? "") });
  back("Модель сохранена", String(formData.get("month") ?? "") || undefined);
}

export async function deleteDraftAction(formData: FormData) {
  await admin();
  const id = String(formData.get("id") ?? "");
  await db.contentDraft.delete({ where: { id } }).catch(() => null);
  back("Черновик удалён", String(formData.get("month") ?? "") || undefined);
}
