import "server-only";
import { db } from "@/lib/db";

/** Какие из переданных вакансий сохранены пользователем. Для гостя пустое множество. */
export async function savedIdsFor(userId: string | undefined, vacancyIds: string[]): Promise<Set<string>> {
  if (!userId || vacancyIds.length === 0) return new Set();
  const rows = await db.savedVacancy.findMany({ where: { userId, vacancyId: { in: vacancyIds } }, select: { vacancyId: true } });
  return new Set(rows.map((r) => r.vacancyId));
}
