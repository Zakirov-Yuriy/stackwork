import { cache } from "react";
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { slugify } from "@/lib/slug";
import type { Grade, Prisma, WorkFormat } from "@/generated/prisma/client";

/**
 * Посадочные страницы по технологиям: /jobs/<skill>, /jobs/<skill>/remote, /jobs/<skill>/<city>
 * и страницы зарплат /salaries/<skill>. Всё считается из опубликованных вакансий и кешируется на час.
 */

/** Минимум вакансий, чтобы у страницы был смысл (и чтобы она попала в карту сайта) */
export const MIN_JOBS = 5;
/** Минимум вакансий с зарплатой для страницы зарплат */
export const MIN_SALARIED = 5;
const CACHE_SECONDS = 3600;
const REMOTE: WorkFormat[] = ["REMOTE", "REMOTE_OR_OFFICE"];
export const GRADES: Grade[] = ["JUNIOR", "MIDDLE", "SENIOR", "LEAD"];

export type Facet = { kind: "remote" } | { kind: "city"; city: string; slug: string };

export type SalaryStat = {
  currency: string;
  /** В каком периоде считаем: рубли в месяц, остальные валюты в год */
  period: "MONTH" | "YEAR";
  count: number;
  median: number;
  p25: number;
  p75: number;
};

export type SkillLanding = {
  skill: { id: string; slug: string; name: string };
  facet: Facet | null;
  total: number;
  remote: number;
  withSalary: number;
  /** Статистика по самой частой валюте */
  salary: SalaryStat | null;
  /** Вторая валюта из пары рубли/доллары, если по ней тоже достаточно вакансий */
  salaryAlt: SalaryStat | null;
  grades: Record<Grade, number>;
  topCompanies: Array<{ name: string; slug: string; count: number }>;
  cities: Array<{ city: string; slug: string; count: number }>;
  related: Array<{ name: string; slug: string; count: number }>;
};

export type SalaryBreakdown = SkillLanding & {
  byGrade: Array<{ grade: Grade; stat: SalaryStat | null }>;
  byFormat: { remote: SalaryStat | null; office: SalaryStat | null };
  /** Медиана по месяцам публикации, последние 6 месяцев, в валюте основной статистики */
  trend: Array<{ month: string; median: number | null; count: number }>;
  topPaid: string[]; // slugs самых высоких вилок
};

export function citySlug(city: string): string {
  return slugify(city);
}

function facetWhere(facet: Facet | null): Prisma.VacancyWhereInput {
  if (!facet) return {};
  if (facet.kind === "remote") return { workFormat: { in: REMOTE } };
  return { city: facet.city };
}

function percentile(sorted: number[], p: number): number {
  if (!sorted.length) return 0;
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx), hi = Math.ceil(idx);
  return Math.round(sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo));
}

type SalaryRow = { salaryFrom: number | null; salaryTo: number | null; currency: string; salaryPeriod: "MONTH" | "YEAR" | "HOUR" };

/** Середина вилки, приведённая к периоду валюты: рубли в месяц, остальное в год */
function normalized(r: SalaryRow): { currency: string; period: "MONTH" | "YEAR"; value: number } | null {
  const from = r.salaryFrom ?? r.salaryTo;
  const to = r.salaryTo ?? r.salaryFrom;
  if (!from || !to) return null;
  const mid = (from + to) / 2;
  const period: "MONTH" | "YEAR" = r.currency === "RUB" ? "MONTH" : "YEAR";
  let value = mid;
  if (period === "MONTH") value = r.salaryPeriod === "YEAR" ? mid / 12 : r.salaryPeriod === "HOUR" ? mid * 168 : mid;
  else value = r.salaryPeriod === "MONTH" ? mid * 12 : r.salaryPeriod === "HOUR" ? mid * 2080 : mid;
  return { currency: r.currency, period, value: Math.round(value) };
}

/** Статистика по самой частой валюте среди вакансий с зарплатой (или по заданной) */
export function salaryStat(rows: SalaryRow[], currency?: string): SalaryStat | null {
  const byCurrency = new Map<string, Array<{ period: "MONTH" | "YEAR"; value: number }>>();
  for (const r of rows) {
    const n = normalized(r);
    if (!n) continue;
    (byCurrency.get(n.currency) ?? byCurrency.set(n.currency, []).get(n.currency)!).push(n);
  }
  const pick = currency ?? [...byCurrency.entries()].sort((a, b) => b[1].length - a[1].length)[0]?.[0];
  const list = pick ? byCurrency.get(pick) : undefined;
  if (!pick || !list?.length) return null;
  const sorted = list.map((x) => x.value).sort((a, b) => a - b);
  return { currency: pick, period: list[0].period, count: sorted.length, median: percentile(sorted, 0.5), p25: percentile(sorted, 0.25), p75: percentile(sorted, 0.75) };
}

export const getSkill = cache(async (slug: string) => db.skill.findUnique({ where: { slug }, select: { id: true, slug: true, name: true } }));

/** Город для slug из адреса: ищем среди городов, где есть вакансии с этой технологией */
export async function resolveFacet(skillId: string, facetSlug: string): Promise<Facet | null> {
  if (facetSlug === "remote") return { kind: "remote" };
  const cities = await db.vacancy.groupBy({ by: ["city"], where: { status: "PUBLISHED", city: { not: null }, skills: { some: { skillId } } }, _count: { _all: true } });
  const hit = cities.find((c) => c.city && citySlug(c.city) === facetSlug && c._count._all >= MIN_JOBS);
  return hit?.city ? { kind: "city", city: hit.city, slug: facetSlug } : null;
}

const computeLanding = unstable_cache(
  async (skillId: string, slug: string, name: string, facet: Facet | null): Promise<SkillLanding> => {
    const base: Prisma.VacancyWhereInput = { status: "PUBLISHED", skills: { some: { skillId } }, ...facetWhere(facet) };
    const [rows, companies, cities, related] = await Promise.all([
      db.vacancy.findMany({ where: base, select: { salaryFrom: true, salaryTo: true, currency: true, salaryPeriod: true, grade: true, workFormat: true } }),
      db.vacancy.groupBy({ by: ["companyId"], where: base, _count: { _all: true }, orderBy: { _count: { companyId: "desc" } }, take: 6 }),
      facet?.kind === "city"
        ? Promise.resolve([])
        : db.vacancy.groupBy({ by: ["city"], where: { ...base, city: { not: null } }, _count: { _all: true }, orderBy: { _count: { city: "desc" } }, take: 8 }),
      db.vacancySkill.groupBy({ by: ["skillId"], where: { skillId: { not: skillId }, vacancy: base }, _count: { _all: true }, orderBy: { _count: { skillId: "desc" } }, take: 10 }),
    ]);
    const grades: Record<Grade, number> = { JUNIOR: 0, MIDDLE: 0, SENIOR: 0, LEAD: 0 };
    let remote = 0, withSalary = 0;
    for (const r of rows) {
      grades[r.grade]++;
      if (REMOTE.includes(r.workFormat)) remote++;
      if (r.salaryFrom || r.salaryTo) withSalary++;
    }
    const [companyRows, skillRows] = await Promise.all([
      db.company.findMany({ where: { id: { in: companies.map((c) => c.companyId) } }, select: { id: true, name: true, slug: true } }),
      db.skill.findMany({ where: { id: { in: related.map((r) => r.skillId) } }, select: { id: true, name: true, slug: true } }),
    ]);
    const companyById = new Map(companyRows.map((c) => [c.id, c]));
    const skillById = new Map(skillRows.map((s) => [s.id, s]));
    const salary = salaryStat(rows);
    const altCurrency = salary?.currency === "RUB" ? "USD" : salary?.currency === "USD" ? "RUB" : null;
    const altCandidates = altCurrency ? [salaryStat(rows, altCurrency)] : [salaryStat(rows, "RUB"), salaryStat(rows, "USD")];
    const salaryAlt = altCandidates.filter((x): x is SalaryStat => Boolean(x && x.count >= MIN_SALARIED)).sort((a, b) => b.count - a.count)[0] ?? null;
    return {
      skill: { id: skillId, slug, name },
      facet,
      total: rows.length,
      remote,
      withSalary,
      salary,
      salaryAlt,
      grades,
      topCompanies: companies.map((c) => ({ ...companyById.get(c.companyId)!, count: c._count._all })).filter((c) => c.name),
      cities: cities.filter((c) => c.city && c._count._all >= MIN_JOBS).map((c) => ({ city: c.city!, slug: citySlug(c.city!), count: c._count._all })),
      related: related.map((r) => ({ ...skillById.get(r.skillId)!, count: r._count._all })).filter((r) => r.name),
    };
  },
  ["landing"],
  { revalidate: CACHE_SECONDS },
);

export const getLanding = cache((skill: { id: string; slug: string; name: string }, facet: Facet | null) => computeLanding(skill.id, skill.slug, skill.name, facet));

const computeSalaries = unstable_cache(
  async (skillId: string, slug: string, name: string): Promise<SalaryBreakdown | null> => {
    const landing = await computeLanding(skillId, slug, name, null);
    if (!landing.salary || landing.salary.count < MIN_SALARIED) return null;
    const currency = landing.salary.currency;
    const rows = await db.vacancy.findMany({
      where: { status: "PUBLISHED", skills: { some: { skillId } }, currency, OR: [{ salaryFrom: { not: null } }, { salaryTo: { not: null } }] },
      select: { slug: true, salaryFrom: true, salaryTo: true, currency: true, salaryPeriod: true, grade: true, workFormat: true, publishedAt: true },
    });
    const byGrade = GRADES.map((grade) => ({ grade, stat: salaryStat(rows.filter((r) => r.grade === grade), currency) }));
    const byFormat = {
      remote: salaryStat(rows.filter((r) => REMOTE.includes(r.workFormat)), currency),
      office: salaryStat(rows.filter((r) => !REMOTE.includes(r.workFormat)), currency),
    };
    const now = new Date();
    const trend = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (5 - i), 1));
      const month = d.toISOString().slice(0, 7);
      const stat = salaryStat(rows.filter((r) => r.publishedAt && r.publishedAt.toISOString().slice(0, 7) === month), currency);
      return { month, median: stat?.median ?? null, count: stat?.count ?? 0 };
    });
    const topPaid = rows
      .map((r) => ({ slug: r.slug, value: normalized(r)?.value ?? 0 }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
      .map((r) => r.slug);
    return { ...landing, byGrade, byFormat, trend, topPaid };
  },
  ["salaries"],
  { revalidate: CACHE_SECONDS },
);

export const getSalaries = cache((skill: { id: string; slug: string; name: string }) => computeSalaries(skill.id, skill.slug, skill.name));

/** Все технологии с посадочными страницами: для карты сайта и каталога /jobs */
export const listLandingSkills = unstable_cache(
  async () => {
    const rows = await db.$queryRaw<Array<{ slug: string; name: string; total: bigint; remote: bigint; salaried: bigint }>>`
      SELECT s."slug", s."name", COUNT(*) AS total,
        COUNT(*) FILTER (WHERE v."workFormat" IN ('REMOTE', 'REMOTE_OR_OFFICE')) AS remote,
        COUNT(*) FILTER (WHERE v."salaryFrom" IS NOT NULL OR v."salaryTo" IS NOT NULL) AS salaried
      FROM "VacancySkill" vs
      JOIN "Vacancy" v ON v."id" = vs."vacancyId" AND v."status" = 'PUBLISHED'
      JOIN "Skill" s ON s."id" = vs."skillId"
      GROUP BY s."slug", s."name"
      HAVING COUNT(*) >= ${MIN_JOBS}
      ORDER BY COUNT(*) DESC`;
    return rows.map((r) => ({ slug: r.slug, name: r.name, total: Number(r.total), remote: Number(r.remote), salaried: Number(r.salaried) }));
  },
  ["landing-skills"],
  { revalidate: CACHE_SECONDS },
);

/** Пары технология + город с достаточным числом вакансий: для карты сайта */
export const listLandingCities = unstable_cache(
  async () => {
    const rows = await db.$queryRaw<Array<{ slug: string; city: string; total: bigint }>>`
      SELECT s."slug", v."city", COUNT(*) AS total
      FROM "VacancySkill" vs
      JOIN "Vacancy" v ON v."id" = vs."vacancyId" AND v."status" = 'PUBLISHED' AND v."city" IS NOT NULL
      JOIN "Skill" s ON s."id" = vs."skillId"
      GROUP BY s."slug", v."city"
      HAVING COUNT(*) >= ${MIN_JOBS}
      ORDER BY COUNT(*) DESC`;
    return rows.map((r) => ({ skill: r.slug, city: r.city, citySlug: citySlug(r.city), total: Number(r.total) }));
  },
  ["landing-cities"],
  { revalidate: CACHE_SECONDS },
);
