import "server-only";
import { redirect } from "next/navigation";
import { getCurrentUser, type CurrentUser } from "@/lib/session";
import type { UserRole } from "@/generated/prisma/client";

/** Страница только для вошедших: иначе редирект на вход с возвратом. */
export async function requireUser(next: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}

/** Страница только для роли (ADMIN проходит везде). */
export async function requireRole(role: UserRole, next: string): Promise<CurrentUser> {
  const user = await requireUser(next);
  if (user.role !== role && user.role !== "ADMIN") redirect("/forbidden");
  return user;
}

/** Работодатель с привязанной компанией. */
export async function requireEmployer(next: string) {
  const user = await requireRole("EMPLOYER", next);
  if (!user.companyId || !user.company) redirect("/employer/company");
  return { ...user, companyId: user.companyId, company: user.company };
}
