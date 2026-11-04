/**
 * Разовый проход по уже импортированным вакансиям без зарплаты: ищем её в тексте описания
 * и записываем (то же, что импорт делает теперь для новых). Запуск: pnpm jobs:salary
 */
import "dotenv/config";
import { db } from "../src/lib/db";
import { stripHtml } from "../src/lib/import/classify";
import { salaryFromDescription } from "../src/lib/import/salary-text";

async function main() {
  const started = Date.now();
  const stats: Record<string, { seen: number; found: number }> = {};
  let cursor: string | undefined;
  let updated = 0;
  for (;;) {
    const rows = await db.vacancy.findMany({
      where: { salaryFrom: null, salaryTo: null, source: { not: "MANUAL" }, status: { in: ["PUBLISHED", "MODERATION", "ARCHIVED"] } },
      select: { id: true, source: true, descriptionHtml: true },
      orderBy: { id: "asc" },
      take: 500,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    if (!rows.length) break;
    cursor = rows[rows.length - 1].id;
    for (const r of rows) {
      const st = (stats[r.source] ??= { seen: 0, found: 0 });
      st.seen++;
      const salary = salaryFromDescription(stripHtml(r.descriptionHtml ?? ""));
      if (!salary) continue;
      await db.vacancy.update({ where: { id: r.id }, data: { salaryFrom: salary.min, salaryTo: salary.max, currency: salary.currency, salaryPeriod: salary.period, salaryType: "GROSS" } });
      st.found++;
      updated++;
    }
  }
  for (const [source, st] of Object.entries(stats)) console.log(`${source.padEnd(15)} без зарплаты ${String(st.seen).padStart(5)}, найдено в тексте ${String(st.found).padStart(5)}`);
  console.log(`Обновлено ${updated} вакансий за ${Math.round((Date.now() - started) / 1000)} с`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => process.exit());
