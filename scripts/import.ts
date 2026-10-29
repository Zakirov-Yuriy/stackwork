/**
 * Импорт вакансий из терминала: pnpm import [SOURCE ...]
 * Без аргументов берёт источники, включённые в настройках админки.
 * Пример: pnpm import REMOTIVE JOBICY
 */
import "dotenv/config";
import { runImport } from "../src/lib/import/run";
import type { VacancySource } from "../src/generated/prisma/client";

async function main() {
  const sources = process.argv.slice(2).map((s) => s.toUpperCase()) as VacancySource[];
  const started = Date.now();
  const results = await runImport({ sources, trigger: "ADMIN" });
  for (const r of results) {
    const line = `${r.source.padEnd(11)} ${r.status.padEnd(5)} получено ${r.fetched}, новых ${r.created}, обновлено ${r.updated}, пропущено ${r.skipped}, в архив ${r.archived}`;
    console.log(r.error ? `${line}\n  ошибка: ${r.error}` : line);
  }
  console.log(`Готово за ${Math.round((Date.now() - started) / 1000)} с`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => process.exit());
