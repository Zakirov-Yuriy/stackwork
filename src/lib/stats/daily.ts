import "server-only";
import { db } from "@/lib/db";
import { Prisma, type VacancySource } from "@/generated/prisma/client";
import { mskDay } from "./track";

export type DailyRow = {
  day: string; // YYYY-MM-DD по Москве
  total: number; // новых вакансий на сайте за день (импорт + работодатели)
  manual: number; // опубликовано работодателями
  bySource: Partial<Record<VacancySource, number>>;
  updated: number; // обновлено импортом
  archived: number; // ушло в архив импортом
  runs: number; // запусков импорта
  errors: number; // запусков с ошибкой
};

/**
 * Новые вакансии по дням: импортированные по дню importedAt и по источнику,
 * вакансии работодателей по дню publishedAt. Счётчики запусков из журнала импорта.
 */
export async function dailyNewVacancies(days = 30): Promise<DailyRow[]> {
  const today = mskDay();
  const to = new Date(`${today}T00:00:00Z`);
  const from = new Date(to.getTime() - (days - 1) * 86_400_000);
  // Границы в UTC: московский день начинается в 21:00 UTC предыдущих суток
  const fromUtc = new Date(from.getTime() - 3 * 3_600_000);

  const [imported, manual, runs] = await Promise.all([
    db.$queryRaw<Array<{ day: string; source: VacancySource; count: bigint }>>(Prisma.sql`
      SELECT to_char(("importedAt" AT TIME ZONE 'Europe/Moscow')::date, 'YYYY-MM-DD') AS day, source, COUNT(*) AS count
      FROM "Vacancy"
      WHERE source <> 'MANUAL' AND "importedAt" >= ${fromUtc}
      GROUP BY 1, 2`),
    db.$queryRaw<Array<{ day: string; count: bigint }>>(Prisma.sql`
      SELECT to_char(("publishedAt" AT TIME ZONE 'Europe/Moscow')::date, 'YYYY-MM-DD') AS day, COUNT(*) AS count
      FROM "Vacancy"
      WHERE source = 'MANUAL' AND "publishedAt" >= ${fromUtc}
      GROUP BY 1`),
    db.$queryRaw<Array<{ day: string; updated: bigint; archived: bigint; runs: bigint; errors: bigint }>>(Prisma.sql`
      SELECT to_char(("startedAt" AT TIME ZONE 'Europe/Moscow')::date, 'YYYY-MM-DD') AS day,
             COALESCE(SUM(updated), 0) AS updated, COALESCE(SUM(archived), 0) AS archived,
             COUNT(*) AS runs, COUNT(*) FILTER (WHERE status = 'ERROR') AS errors
      FROM "ImportRun"
      WHERE "startedAt" >= ${fromUtc}
      GROUP BY 1`),
  ]);

  const rows = new Map<string, DailyRow>();
  for (let i = 0; i < days; i++) {
    const day = new Date(from.getTime() + i * 86_400_000).toISOString().slice(0, 10);
    rows.set(day, { day, total: 0, manual: 0, bySource: {}, updated: 0, archived: 0, runs: 0, errors: 0 });
  }
  for (const r of imported) {
    const row = rows.get(r.day);
    if (!row) continue;
    const n = Number(r.count);
    row.bySource[r.source] = (row.bySource[r.source] ?? 0) + n;
    row.total += n;
  }
  for (const r of manual) {
    const row = rows.get(r.day);
    if (!row) continue;
    row.manual += Number(r.count);
    row.total += Number(r.count);
  }
  for (const r of runs) {
    const row = rows.get(r.day);
    if (!row) continue;
    row.updated = Number(r.updated);
    row.archived = Number(r.archived);
    row.runs = Number(r.runs);
    row.errors = Number(r.errors);
  }
  return [...rows.values()];
}
