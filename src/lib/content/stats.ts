import "server-only";
import { db } from "@/lib/db";
import { salaryStat, type SalaryStat } from "@/lib/landing";
import type { Grade, VacancyStatus } from "@/generated/prisma/client";

/**
 * Цифры за период (неделя или месяц) для дайджеста в канал и ежемесячной статьи:
 * сколько вакансий опубликовано, с зарплатой, удалённых, по грейдам, по стекам, компании,
 * самые высокие вилки. Считаем по дате публикации, включая уже закрытые вакансии.
 */

export type Period = { from: Date; to: Date; label: string; key: string };

export type StackStat = { slug: string; name: string; count: number; remote: number; salary: SalaryStat | null; salaryRub: SalaryStat | null; salaryUsd: SalaryStat | null };

export type TopVacancy = { id: string; slug: string; title: string; company: string; salaryFrom: number | null; salaryTo: number | null; currency: string; salaryPeriod: "MONTH" | "YEAR" | "HOUR"; usdYear: number };

export type PeriodStats = {
  period: Period;
  total: number;
  withSalary: number;
  remote: number;
  russian: number; // вакансии на русском (локальный рынок)
  grades: Record<Grade, number>;
  stacks: StackStat[];
  gradeSalaryUsd: Array<{ grade: Grade; stat: SalaryStat | null }>;
  gradeSalaryRub: Array<{ grade: Grade; stat: SalaryStat | null }>;
  companies: Array<{ name: string; slug: string; count: number }>;
  topPaid: TopVacancy[];
  /** Доля вакансий по валютам среди тех, где зарплата указана */
  currencies: Array<{ currency: string; count: number }>;
};

/** Грубые курсы к доллару только для сортировки вилок в разных валютах между собой */
const USD_RATE: Record<string, number> = {
  USD: 1, EUR: 1.08, GBP: 1.27, CAD: 0.73, AUD: 0.66, CHF: 1.12, SGD: 0.75, PLN: 0.25, RUB: 0.011, INR: 0.012, BRL: 0.18, MXN: 0.05, JPY: 0.0067, NZD: 0.6,
  SEK: 0.095, DKK: 0.145, NOK: 0.093, AED: 0.27, ILS: 0.27, CZK: 0.043, HUF: 0.0027, PHP: 0.017, TRY: 0.03, UAH: 0.024, KZT: 0.002, BYN: 0.3, ARS: 0.001,
  COP: 0.00024, CLP: 0.001, ZAR: 0.055, NGN: 0.0007, KES: 0.0077, EGP: 0.02, PKR: 0.0036, BDT: 0.0084, VND: 0.00004, IDR: 0.000063, THB: 0.029, MYR: 0.22,
  HKD: 0.13, TWD: 0.031, KRW: 0.00073, CNY: 0.14, GEL: 0.37, AMD: 0.0026, RSD: 0.0092, RON: 0.22, BGN: 0.55,
};
// Неизвестная валюта: считаем дешёвой, чтобы не попасть в топ по ошибке
const UNKNOWN_RATE = 0.01;

export function usdPerYear(v: { salaryFrom: number | null; salaryTo: number | null; currency: string; salaryPeriod: "MONTH" | "YEAR" | "HOUR" }): number {
  const from = v.salaryFrom ?? v.salaryTo ?? 0;
  const to = v.salaryTo ?? v.salaryFrom ?? 0;
  const mid = (from + to) / 2;
  const yearly = v.salaryPeriod === "MONTH" ? mid * 12 : v.salaryPeriod === "HOUR" ? mid * 2080 : mid;
  return Math.round(yearly * (USD_RATE[v.currency] ?? UNKNOWN_RATE));
}

const MSK = 3 * 3_600_000;
const RU_MONTHS = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
const RU_MONTHS_NOM = ["январь", "февраль", "март", "апрель", "май", "июнь", "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь"];

function mskDate(d: Date): Date {
  return new Date(d.getTime() + MSK);
}

/** Прошедшая полная неделя (понедельник–воскресенье по Москве) относительно now */
export function lastWeek(now = new Date()): Period {
  const m = mskDate(now);
  const dow = (m.getUTCDay() + 6) % 7; // 0 = понедельник
  const thisMonday = Date.UTC(m.getUTCFullYear(), m.getUTCMonth(), m.getUTCDate() - dow) - MSK;
  const from = new Date(thisMonday - 7 * 86_400_000);
  const to = new Date(thisMonday);
  return { from, to, label: weekLabel(from, to), key: `W${isoWeek(from)}` };
}

/** Прошедший календарный месяц по Москве */
export function lastMonth(now = new Date()): Period {
  const m = mskDate(now);
  const from = new Date(Date.UTC(m.getUTCFullYear(), m.getUTCMonth() - 1, 1) - MSK);
  const to = new Date(Date.UTC(m.getUTCFullYear(), m.getUTCMonth(), 1) - MSK);
  const f = mskDate(from);
  return { from, to, label: `${RU_MONTHS_NOM[f.getUTCMonth()]} ${f.getUTCFullYear()}`, key: `${f.getUTCFullYear()}-${String(f.getUTCMonth() + 1).padStart(2, "0")}` };
}

/** Месяц по ключу «2026-10» */
export function monthByKey(key: string): Period | null {
  const m = /^(\d{4})-(\d{2})$/.exec(key);
  if (!m) return null;
  const y = Number(m[1]), mo = Number(m[2]) - 1;
  if (mo < 0 || mo > 11) return null;
  const from = new Date(Date.UTC(y, mo, 1) - MSK);
  const to = new Date(Date.UTC(y, mo + 1, 1) - MSK);
  return { from, to, label: `${RU_MONTHS_NOM[mo]} ${y}`, key };
}

export function previousPeriod(p: Period): Period {
  const monthKey = /^(\d{4})-(\d{2})$/.exec(p.key);
  if (monthKey) {
    // Календарный предыдущий месяц, а не «минус 31 день»
    const d = new Date(Date.UTC(Number(monthKey[1]), Number(monthKey[2]) - 2, 1));
    return monthByKey(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`)!;
  }
  const len = p.to.getTime() - p.from.getTime();
  const from = new Date(p.from.getTime() - len);
  const to = new Date(p.from.getTime());
  return { from, to, label: weekLabel(from, to), key: `W${isoWeek(from)}` };
}

/** «27 октября – 2 ноября» */
function weekLabel(from: Date, to: Date): string {
  const a = mskDate(from), b = mskDate(new Date(to.getTime() - 1));
  const sameMonth = a.getUTCMonth() === b.getUTCMonth();
  return sameMonth ? `${a.getUTCDate()} – ${b.getUTCDate()} ${RU_MONTHS[b.getUTCMonth()]}` : `${a.getUTCDate()} ${RU_MONTHS[a.getUTCMonth()]} – ${b.getUTCDate()} ${RU_MONTHS[b.getUTCMonth()]}`;
}

function isoWeek(d: Date): string {
  const date = mskDate(d);
  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - day + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((target.getTime() - firstThursday.getTime()) / 86_400_000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  return `${target.getUTCFullYear()}-${String(week).padStart(2, "0")}`;
}

const GRADES: Grade[] = ["JUNIOR", "MIDDLE", "SENIOR", "LEAD"];

export async function periodStats(period: Period, opts: { stacks?: number; topPaid?: number; companies?: number } = {}): Promise<PeriodStats> {
  const statuses: VacancyStatus[] = ["PUBLISHED", "ARCHIVED"];
  const where = { status: { in: statuses }, publishedAt: { gte: period.from, lt: period.to } };
  const rows = await db.vacancy.findMany({
    where,
    select: {
      id: true, slug: true, title: true, grade: true, workFormat: true, language: true,
      salaryFrom: true, salaryTo: true, currency: true, salaryPeriod: true,
      company: { select: { name: true, slug: true } },
      skills: { select: { skill: { select: { slug: true, name: true } } } },
    },
  });
  const grades: Record<Grade, number> = { JUNIOR: 0, MIDDLE: 0, SENIOR: 0, LEAD: 0 };
  const bySkill = new Map<string, { name: string; rows: typeof rows }>();
  const byCompany = new Map<string, { name: string; count: number }>();
  const byCurrency = new Map<string, number>();
  let withSalary = 0, remote = 0, russian = 0;
  for (const r of rows) {
    grades[r.grade]++;
    const salaried = Boolean(r.salaryFrom || r.salaryTo);
    if (salaried) {
      withSalary++;
      byCurrency.set(r.currency, (byCurrency.get(r.currency) ?? 0) + 1);
    }
    if (r.workFormat === "REMOTE" || r.workFormat === "REMOTE_OR_OFFICE") remote++;
    if (r.language === "ru") russian++;
    for (const s of r.skills) (bySkill.get(s.skill.slug) ?? bySkill.set(s.skill.slug, { name: s.skill.name, rows: [] }).get(s.skill.slug)!).rows.push(r);
    const c = byCompany.get(r.company.slug) ?? { name: r.company.name, count: 0 };
    c.count++;
    byCompany.set(r.company.slug, c);
  }
  const stacks: StackStat[] = [...bySkill.entries()]
    .map(([slug, e]) => ({
      slug,
      name: e.name,
      count: e.rows.length,
      remote: e.rows.filter((r) => r.workFormat === "REMOTE" || r.workFormat === "REMOTE_OR_OFFICE").length,
      salary: salaryStat(e.rows),
      salaryRub: salaryStat(e.rows, "RUB"),
      salaryUsd: salaryStat(e.rows, "USD"),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, opts.stacks ?? 15);
  const salaried = rows.filter((r) => r.salaryFrom || r.salaryTo);
  const topPaid: TopVacancy[] = salaried
    .map((r) => ({ id: r.id, slug: r.slug, title: r.title, company: r.company.name, salaryFrom: r.salaryFrom, salaryTo: r.salaryTo, currency: r.currency, salaryPeriod: r.salaryPeriod, usdYear: usdPerYear(r) }))
    .sort((a, b) => b.usdYear - a.usdYear)
    .filter((v, i, arr) => arr.findIndex((x) => x.title === v.title && x.company === v.company) === i) // дубли одной вакансии в разных регионах
    .slice(0, opts.topPaid ?? 5);
  return {
    period,
    total: rows.length,
    withSalary,
    remote,
    russian,
    grades,
    stacks,
    gradeSalaryUsd: GRADES.map((grade) => ({ grade, stat: salaryStat(rows.filter((r) => r.grade === grade), "USD") })),
    gradeSalaryRub: GRADES.map((grade) => ({ grade, stat: salaryStat(rows.filter((r) => r.grade === grade), "RUB") })),
    companies: [...byCompany.entries()].map(([slug, c]) => ({ slug, ...c })).sort((a, b) => b.count - a.count).slice(0, opts.companies ?? 5),
    topPaid,
    currencies: [...byCurrency.entries()].map(([currency, count]) => ({ currency, count })).sort((a, b) => b.count - a.count),
  };
}

/** Изменение в процентах; null, если сравнивать не с чем */
export function delta(now: number, before: number): number | null {
  if (!before) return null;
  return Math.round(((now - before) / before) * 100);
}

export function deltaText(d: number | null): string {
  if (d === null) return "";
  if (d === 0) return "без изменений";
  return `${d > 0 ? "+" : "−"}${Math.abs(d)}%`;
}
