import "server-only";
import { db } from "@/lib/db";
import { siteUrl } from "@/lib/mail";
import { makeLabels, CURRENCY_SIGN } from "@/lib/labels";
import { monthByKey, periodStats, previousPeriod, delta, deltaText, type PeriodStats } from "./stats";
import type { SalaryStat } from "@/lib/landing";

/**
 * Ежемесячная статья с данными: заготовка в Markdown для Хабра и vc.ru.
 * Собирается из цифр базы без нейросети; нейросеть (llm.ts) может дописать связный текст поверх.
 */

const L = makeLabels("ru");
const GRADE: Record<string, string> = { JUNIOR: "Junior", MIDDLE: "Middle", SENIOR: "Senior", LEAD: "Lead" };

function money(s: SalaryStat, v: number): string {
  return `${L.nf.format(v)} ${CURRENCY_SIGN[s.currency] ?? s.currency}`;
}

function row(cells: string[]): string {
  return `| ${cells.join(" | ")} |`;
}

function pctOf(n: number, total: number): string {
  return total ? `${Math.round((n / total) * 100)}%` : "—";
}

export type Article = { period: PeriodStats["period"]; stats: PeriodStats; prev: PeriodStats; markdown: string; title: string; facts: string[] };

/** Выводы, вычисленные из цифр: их же получает нейросеть как обязательные факты */
function conclusions(stats: PeriodStats, prev: PeriodStats): string[] {
  const out: string[] = [];
  // Сравнение с прошлым месяцем имеет смысл, только если данные за него сопоставимы (сайт мог только запуститься)
  const comparable = prev.total >= stats.total * 0.3;
  const d = comparable ? delta(stats.total, prev.total) : null;
  out.push(`За ${stats.period.label} на Stackwork опубликовано ${L.formatVacancyCount(stats.total)}${d !== null ? `, это ${deltaText(d)} к предыдущему месяцу (${prev.period.label}: ${L.formatVacancyCount(prev.total)})` : ""}.`);
  out.push(`Зарплата указана в ${pctOf(stats.withSalary, stats.total)} вакансий, удалённая работа в ${pctOf(stats.remote, stats.total)}, на русском языке ${pctOf(stats.russian, stats.total)}.`);
  if (stats.stacks[0]) out.push(`Самый частый стек: ${stats.stacks[0].name} (${L.formatVacancyCount(stats.stacks[0].count)}), за ним ${stats.stacks.slice(1, 4).map((s) => s.name).join(", ")}.`);
  const usd = stats.stacks.filter((s) => s.salaryUsd && s.salaryUsd.count >= 10).sort((a, b) => (b.salaryUsd?.median ?? 0) - (a.salaryUsd?.median ?? 0));
  if (usd[0]?.salaryUsd) out.push(`Самая высокая медиана в долларах среди стеков с 10+ вакансиями: ${usd[0].name}, ${money(usd[0].salaryUsd, usd[0].salaryUsd.median)} в год; самая низкая: ${usd[usd.length - 1].name}, ${money(usd[usd.length - 1].salaryUsd!, usd[usd.length - 1].salaryUsd!.median)} в год.`);
  const rub = stats.stacks.filter((s) => s.salaryRub && s.salaryRub.count >= 10).sort((a, b) => (b.salaryRub?.median ?? 0) - (a.salaryRub?.median ?? 0));
  if (rub[0]?.salaryRub) out.push(`В рублях лидирует ${rub[0].name}: медиана ${money(rub[0].salaryRub, rub[0].salaryRub.median)} в месяц${rub.length > 1 ? `, замыкает список ${rub[rub.length - 1].name} с ${money(rub[rub.length - 1].salaryRub!, rub[rub.length - 1].salaryRub!.median)}` : ""}.`);
  const growth = (comparable ? stats.stacks : [])
    .map((s) => ({ s, before: prev.stacks.find((p) => p.slug === s.slug)?.count ?? 0 }))
    .filter((x) => x.before >= 10)
    .map((x) => ({ ...x, d: delta(x.s.count, x.before)! }))
    .sort((a, b) => b.d - a.d);
  if (growth[0] && growth[0].d > 0) out.push(`Быстрее всего растёт спрос на ${growth[0].s.name}: ${deltaText(growth[0].d)} вакансий к прошлому месяцу.`);
  const fall = growth[growth.length - 1];
  if (fall && fall.d < 0) out.push(`Сильнее всего просел ${fall.s.name}: ${deltaText(fall.d)}.`);
  const seniorShare = pctOf(stats.grades.SENIOR + stats.grades.LEAD, stats.total);
  out.push(`Senior и Lead составляют ${seniorShare} вакансий, Junior ${pctOf(stats.grades.JUNIOR, stats.total)}.`);
  if (stats.topPaid[0]) out.push(`Самая высокая вилка месяца: ${stats.topPaid[0].title} в ${stats.topPaid[0].company}, ${L.formatSalary(stats.topPaid[0].salaryFrom, stats.topPaid[0].salaryTo, stats.topPaid[0].currency)}${L.periodSuffix(stats.topPaid[0].salaryPeriod, true)}.`);
  if (stats.companies[0]) out.push(`Больше всех нанимали ${stats.companies.slice(0, 3).map((c) => `${c.name} (${c.count})`).join(", ")}.`);
  return out;
}

export function formatArticle(stats: PeriodStats, prev: PeriodStats): { markdown: string; title: string; facts: string[] } {
  const p = stats.period;
  const title = `Зарплаты и вакансии в IT за ${p.label}: ${L.formatVacancyCount(stats.total)}, ${pctOf(stats.withSalary, stats.total)} с указанной зарплатой`;
  const facts = conclusions(stats, prev);
  const md: string[] = [];
  md.push(`# ${title}`, "");
  md.push(`Stackwork собирает IT-вакансии с указанной зарплатой с открытых досок работодателей, «Работы России», Hacker News и агрегаторов. Ниже цифры за ${p.label}: сколько вакансий появилось, что платят по стекам и грейдам, кто нанимал. Для расчётов берётся середина зарплатной вилки, по ней медиана и 25–75 процентили. Доллары считаем в год, рубли в месяц; вакансии в других валютах в таблицы по зарплатам не входят.`, "");
  md.push("## Коротко", "");
  for (const f of facts) md.push(`- ${f}`);
  md.push("");

  md.push("## Сколько вакансий", "");
  md.push(row(["Показатель", p.label, prev.period.label, "Изменение"]), row(["---", "---", "---", "---"]));
  const cmp = (label: string, a: number, b: number) => md.push(row([label, L.nf.format(a), L.nf.format(b), deltaText(delta(a, b)) || "—"]));
  cmp("Опубликовано вакансий", stats.total, prev.total);
  cmp("С указанной зарплатой", stats.withSalary, prev.withSalary);
  cmp("Удалённых", stats.remote, prev.remote);
  cmp("На русском языке", stats.russian, prev.russian);
  md.push("");
  md.push(row(["Грейд", "Вакансий", "Доля"]), row(["---", "---", "---"]));
  for (const g of ["JUNIOR", "MIDDLE", "SENIOR", "LEAD"] as const) md.push(row([GRADE[g], L.nf.format(stats.grades[g]), pctOf(stats.grades[g], stats.total)]));
  md.push("");

  md.push("## Самые частые стеки", "");
  md.push(row(["Стек", "Вакансий", "Доля удалённых"]), row(["---", "---", "---"]));
  for (const s of stats.stacks.slice(0, 15)) md.push(row([`[${s.name}](${siteUrl(`/jobs/${s.slug}`)})`, L.nf.format(s.count), pctOf(s.remote, s.count)]));
  md.push("");

  const usd = stats.stacks.filter((s) => s.salaryUsd && s.salaryUsd.count >= 5);
  if (usd.length) {
    md.push("## Зарплаты по стеку в долларах, в год", "");
    md.push(`![Медианные зарплаты по стеку в долларах, ${p.label}](${siteUrl(`/api/og/report/${p.key}.png?currency=USD`)})`, "");
    md.push(row(["Стек", "Вакансий с зарплатой", "Медиана", "25–75 процентиль"]), row(["---", "---", "---", "---"]));
    for (const s of usd) md.push(row([`[${s.name}](${siteUrl(`/salaries/${s.slug}`)})`, String(s.salaryUsd!.count), money(s.salaryUsd!, s.salaryUsd!.median), `${L.nf.format(s.salaryUsd!.p25)} – ${money(s.salaryUsd!, s.salaryUsd!.p75)}`]));
    md.push("");
  }
  const rub = stats.stacks.filter((s) => s.salaryRub && s.salaryRub.count >= 5);
  if (rub.length) {
    md.push("## Зарплаты по стеку в рублях, в месяц", "");
    md.push(`![Медианные зарплаты по стеку в рублях, ${p.label}](${siteUrl(`/api/og/report/${p.key}.png?currency=RUB`)})`, "");
    md.push(row(["Стек", "Вакансий с зарплатой", "Медиана", "25–75 процентиль"]), row(["---", "---", "---", "---"]));
    for (const s of rub) md.push(row([`[${s.name}](${siteUrl(`/salaries/${s.slug}`)})`, String(s.salaryRub!.count), money(s.salaryRub!, s.salaryRub!.median), `${L.nf.format(s.salaryRub!.p25)} – ${money(s.salaryRub!, s.salaryRub!.p75)}`]));
    md.push("");
  }

  const gradeRows = (list: PeriodStats["gradeSalaryUsd"], unit: string) => {
    const has = list.filter((g) => g.stat && g.stat.count >= 5);
    if (!has.length) return;
    md.push(row(["Грейд", "Вакансий", `Медиана, ${unit}`, "25–75 процентиль"]), row(["---", "---", "---", "---"]));
    for (const g of has) md.push(row([GRADE[g.grade], String(g.stat!.count), money(g.stat!, g.stat!.median), `${L.nf.format(g.stat!.p25)} – ${money(g.stat!, g.stat!.p75)}`]));
    md.push("");
  };
  md.push("## По грейдам", "");
  gradeRows(stats.gradeSalaryUsd, "в год");
  gradeRows(stats.gradeSalaryRub, "в месяц");

  if (stats.topPaid.length) {
    md.push("## Самые высокие вилки месяца", "");
    stats.topPaid.forEach((v, i) => md.push(`${i + 1}. [${v.title}](${siteUrl(`/vacancies/${v.slug}`)}), ${v.company}: ${L.formatSalary(v.salaryFrom, v.salaryTo, v.currency)}${L.periodSuffix(v.salaryPeriod, true)}`));
    md.push("");
  }
  if (stats.companies.length) {
    md.push("## Кто нанимал больше всех", "");
    for (const c of stats.companies) md.push(`- [${c.name}](${siteUrl(`/companies/${c.slug}`)}): ${L.formatVacancyCount(c.count)}`);
    md.push("");
  }
  md.push("## Методика", "");
  md.push(`Вакансии собраны импортом с открытых источников и опубликованы на [Stackwork](${siteUrl("/")}) в ${p.label}; закрытые к моменту публикации статьи тоже учтены. Зарплата берётся из структурированных данных источника или из текста вакансии (диапазоны вида «$150,000 – $200,000»). Для каждой вакансии считается середина вилки, затем медиана и 25-й и 75-й процентили по стеку и грейду. Стек определяется по названию и тексту вакансии, одна вакансия может относиться к нескольким стекам. Грейд берётся из названия вакансии и описания; если явных признаков нет, вакансия считается Middle, поэтому доля Middle завышена. Курсы валют не используются: доллары и рубли считаются отдельно.`, "");
  md.push(`Актуальные цифры по каждой технологии: [зарплаты по стеку](${siteUrl("/salaries")}), [вакансии по технологиям](${siteUrl("/jobs")}).`);
  return { markdown: md.join("\n"), title, facts };
}

export async function buildArticle(monthKey: string): Promise<Article | null> {
  const period = monthByKey(monthKey);
  if (!period) return null;
  const [stats, prev] = await Promise.all([periodStats(period, { stacks: 20, topPaid: 10, companies: 10 }), periodStats(previousPeriod(period), { stacks: 20, topPaid: 1, companies: 1 })]);
  const { markdown, title, facts } = formatArticle(stats, prev);
  return { period, stats, prev, markdown, title, facts };
}

export async function saveArticleDraft(a: Article, markdown = a.markdown, model: string | null = null): Promise<string> {
  const draft = await db.contentDraft.create({
    data: { kind: "ARTICLE", period: a.period.key, title: a.title, markdown, model, data: JSON.parse(JSON.stringify({ facts: a.facts, total: a.stats.total, withSalary: a.stats.withSalary, remote: a.stats.remote })) },
    select: { id: true },
  });
  return draft.id;
}
