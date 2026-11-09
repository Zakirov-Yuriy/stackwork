"use server";

import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { db } from "@/lib/db";
import { getCurrentUser, clearSessionCookie } from "@/lib/session";
import { verifyPassword } from "@/lib/password";
import { rateLimited } from "@/lib/rate-limit";

export type DeleteState = { error?: string } | undefined;

/** Удаление аккаунта с подтверждением паролем. Отклики, сохранённые и токены удаляются каскадом. */
export async function deleteAccountAction(_prev: DeleteState, formData: FormData): Promise<DeleteState> {
  const [user, t, locale] = await Promise.all([getCurrentUser(), getTranslations("me.delete"), getLocale() as Promise<Locale>]);
  if (!user) redirect({ href: "/login?next=/me/delete", locale });
  if (user.role === "ADMIN") return { error: t("adminError") };
  if (await rateLimited("delete-account", 5, 900)) return { error: t("tooMany") };
  const row = await db.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } });
  if (!(await verifyPassword(String(formData.get("password") ?? ""), row?.passwordHash))) return { error: t("wrongPassword") };
  if (formData.get("confirm") !== "on") return { error: t("confirmRequired") };
  await db.user.delete({ where: { id: user.id } });
  await clearSessionCookie();
  redirect({ href: "/?deleted=1", locale });
}
