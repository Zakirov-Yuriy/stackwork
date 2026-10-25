"use server";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { rateLimited } from "@/lib/rate-limit";
import { verifyTurnstile } from "@/lib/turnstile";

export type ReportState = { error?: string; success?: string } | undefined;

export async function reportAction(_prev: ReportState, formData: FormData): Promise<ReportState> {
  const slug = String(formData.get("slug") ?? "");
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 200);
  const comment = String(formData.get("comment") ?? "").trim().slice(0, 2000) || null;
  const emailRaw = String(formData.get("email") ?? "").trim().toLowerCase().slice(0, 200);
  if (!reason) return { error: "Выберите причину" };
  if (await rateLimited("report", 5, 3600)) return { error: "Слишком много жалоб за час. Попробуйте позже" };
  if (!(await verifyTurnstile(formData.get("cf-turnstile-response")))) return { error: "Не удалось пройти проверку «я не робот». Обновите страницу и попробуйте снова" };

  const vacancy = await db.vacancy.findUnique({ where: { slug }, select: { id: true } });
  if (!vacancy) return { error: "Вакансия не найдена" };

  const user = await getCurrentUser();
  await db.report.create({
    data: { vacancyId: vacancy.id, userId: user?.id ?? null, reason, comment, email: user?.email ?? (emailRaw || null) },
  });
  return { success: "Спасибо, жалоба отправлена. Модератор посмотрит вакансию в течение рабочего дня." };
}
