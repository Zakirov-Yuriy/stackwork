"use server";

import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { rateLimited } from "@/lib/rate-limit";
import { verifyTurnstile } from "@/lib/turnstile";

export type ReportState = { error?: string; success?: string } | undefined;

export async function reportAction(_prev: ReportState, formData: FormData): Promise<ReportState> {
  const slug = String(formData.get("slug") ?? "");
  const reasonKey = String(formData.get("reason") ?? "").trim();
  const comment = String(formData.get("comment") ?? "").trim().slice(0, 2000) || null;
  const emailRaw = String(formData.get("email") ?? "").trim().toLowerCase().slice(0, 200);
  // Тексты ошибок на языке пользователя; причина в базу уходит по-русски: её читает модератор в админке
  const [t, tRu] = await Promise.all([getTranslations("report"), getTranslations({ locale: "ru", namespace: "report" })]);
  const reason = /^[a-z]+$/.test(reasonKey) && tRu.has(`reasons.${reasonKey}`) ? tRu(`reasons.${reasonKey}`).slice(0, 200) : "";
  if (!reason) return { error: t("errors.noReason") };
  if (await rateLimited("report", 5, 3600)) return { error: t("errors.tooMany") };
  if (!(await verifyTurnstile(formData.get("cf-turnstile-response")))) return { error: t("errors.captcha") };

  const vacancy = await db.vacancy.findUnique({ where: { slug }, select: { id: true } });
  if (!vacancy) return { error: t("errors.notFound") };

  const user = await getCurrentUser();
  await db.report.create({
    data: { vacancyId: vacancy.id, userId: user?.id ?? null, reason, comment, email: user?.email ?? (emailRaw || null) },
  });
  return { success: t("success") };
}
