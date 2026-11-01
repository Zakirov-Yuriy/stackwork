import "server-only";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getCurrentUser, type CurrentUser } from "@/lib/session";
import type { UserRole } from "@/generated/prisma/client";

/** Страница только для вошедших: иначе редирект на вход с возвратом. */
export async function requireUser(next: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect({ href: `/login?next=${encodeURIComponent(next)}`, locale: await getLocale() });
  return user;
}

/** Страница только для роли (ADMIN проходит везде). */
export async function requireRole(role: UserRole, next: string): Promise<CurrentUser> {
  const user = await requireUser(next);
  if (user.role !== role && user.role !== "ADMIN") redirect({ href: "/forbidden", locale: await getLocale() });
  return user;
}

/** Работодатель с привязанной компанией. */
export async function requireEmployer(next: string) {
  const user = await requireRole("EMPLOYER", next);
  if (!user.companyId || !user.company) redirect({ href: "/employer/company", locale: await getLocale() });
  return { ...user, companyId: user.companyId, company: user.company };
}
