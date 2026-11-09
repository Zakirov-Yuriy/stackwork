import "server-only";
import { db } from "@/lib/db";
import { MIN_SALARIED } from "@/lib/landing";

/** Сводная таблица зарплат по стекам для /salaries и API: рубли в месяц, доллары в год (середина вилки, медианы) */

export type SalaryRow = { slug: string; name: string; count: number; median: number; from: number; to: number };

function median(xs: number[]) {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
}

type Raw = { skill: { slug: string; name: string }; vacancy: { salaryFrom: number | null; salaryTo: number | null; currency: string; salaryPeriod: "MONTH" | "YEAR" | "HOUR" } };

export function statsFor(rows: Raw[], currency: string): SalaryRow[] {
  const bySkill = new Map<string, { name: string; slug: string; mids: number[]; froms: number[]; tos: number[] }>();
  for (const r of rows) {
    if (r.vacancy.currency !== currency) continue;
    const k = currency === "RUB" ? (r.vacancy.salaryPeriod === "YEAR" ? 1 / 12 : r.vacancy.salaryPeriod === "HOUR" ? 168 : 1) : r.vacancy.salaryPeriod === "MONTH" ? 12 : r.vacancy.salaryPeriod === "HOUR" ? 2080 : 1;
    const from = Math.round((r.vacancy.salaryFrom ?? r.vacancy.salaryTo!) * k);
    const to = Math.round((r.vacancy.salaryTo ?? r.vacancy.salaryFrom!) * k);
    const e = bySkill.get(r.skill.slug) ?? { name: r.skill.name, slug: r.skill.slug, mids: [], froms: [], tos: [] };
    e.mids.push(Math.round((from + to) / 2));
    e.froms.push(from);
    e.tos.push(to);
    bySkill.set(r.skill.slug, e);
  }
  return [...bySkill.values()]
    .filter((e) => e.mids.length >= MIN_SALARIED)
    .map((e) => ({ name: e.name, slug: e.slug, count: e.mids.length, median: median(e.mids)!, from: median(e.froms)!, to: median(e.tos)! }))
    .sort((a, b) => b.count - a.count || b.median - a.median);
}

/** Таблицы по рублям и долларам из опубликованных вакансий с зарплатой */
export async function salaryTables(): Promise<{ rub: SalaryRow[]; usd: SalaryRow[] }> {
  const rows = await db.vacancySkill.findMany({
    where: { vacancy: { status: "PUBLISHED", OR: [{ salaryFrom: { not: null } }, { salaryTo: { not: null } }] } },
    select: { skill: { select: { slug: true, name: true } }, vacancy: { select: { salaryFrom: true, salaryTo: true, currency: true, salaryPeriod: true } } },
  });
  return { rub: statsFor(rows, "RUB"), usd: statsFor(rows, "USD") };
}
