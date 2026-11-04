import type { SalaryPeriod } from "@/generated/prisma/client";

/**
 * Зарплата из текста описания. Американские и европейские вакансии часто не отдают
 * зарплату отдельным полем, но пишут её в тексте (законы о прозрачности оплаты в США):
 * «The base salary range for this position is $217,000 — $303,900 USD»,
 * «CAN base pay range per year: CAD $181,000 - CAD $241,000», «Salary: £35,000-£45,000»,
 * «Comp: $150k - $180k/year», «Зарплата: 250 000 – 350 000 ₽», «65.000 € - 85.000 €».
 * Берём только суммы с валютой и правдоподобной величиной; опционы, бонусы и бюджеты
 * («New hire equity: $16,000-$24,000», «Learning budget: $1,500») пропускаем.
 */

export type TextSalary = { min: number | null; max: number | null; currency: string; period: SalaryPeriod };

const CODE = "USD|CAD|EUR|GBP|AUD|CHF|PLN|SGD|INR|NZD|SEK|DKK|NOK|BRL|MXN|JPY|RUB|AED|ILS|CZK|HUF";
const SYM = "R\\$|C\\$|CA\\$|A\\$|US\\$|\\$|€|£|₽";
const NUM = "\\d{1,3}(?:[, ]\\d{3})+(?:\\.\\d{1,2})?|\\d{2,3}(?:\\.\\d{3})+|\\d{4,7}(?:\\.\\d{1,2})?|\\d{2,3}(?:\\.\\d)?\\s?[kK]\\b|\\d{2,3}(?![\\d,.])";
const UNIT = "(?:\\s?(?:\\/|per)\\s?(?:year|yr|annum|month|mo|hour|hr|h))?";
const DASH = "\\s?(?:--|-|–|—|to|and|до)\\s?";
// Диапазон: [код] [символ] число [символ] [единица] тире [код] [символ] число [символ] [единица] [код]
const RANGE = new RegExp(
  `(?:(?<code1>${CODE})\\s?)?(?<sym1>${SYM})?\\s?(?<num1>${NUM})(?:\\s?(?<sym1b>${SYM}))?${UNIT}${DASH}(?:(?:${CODE})\\s?)?(?<sym2>${SYM})?\\s?(?<num2>${NUM})(?:\\s?(?<sym2b>${SYM}))?${UNIT}(?:\\s?(?<code2>${CODE}))?`,
  "g",
);
// Одно число сразу после слова про зарплату: «Salary: $150,000», «Compensation: up to €80k»
const SINGLE = new RegExp(
  `(?:salary|compensation|comp|pay|wage|remuneration|\\bote|зарплата|оклад)(?<gap>[^$€£₽\\d]{0,40}?)(?<upto>up to\\s?|до\\s?)?(?:(?<code1>${CODE})\\s?)?(?<sym1>${SYM})?\\s?(?<num1>${NUM})(?:\\s?(?<sym1b>${SYM}))?${UNIT}(?:\\s?(?<code2>${CODE}))?`,
  "gi",
);

const SYM_CUR: Record<string, string> = { $: "USD", US$: "USD", C$: "CAD", CA$: "CAD", A$: "AUD", R$: "BRL", "€": "EUR", "£": "GBP", "₽": "RUB" };
const POSITIVE = /(salary|salaries|compensation|\bcomp\b|\bpay\b|base pay|wage|\bote\b|hiring range|pay band|remuneration|earn|\brate\b|rémunération|gehalt|зарплат|оклад|доход)/i;
// Подпись прямо перед числом, после которой это не зарплата
const NEGATIVE_LABEL = new RegExp(
  `\\b(equity|refresh|bonus|stock|options?|grant|signing|sign-on|funding|raised|budget|stipend|allowance|reimbursement|credit|revenue|valuation|arr|mrr|fine|penalty|deductible|premium|бюджет|бонус)\\s*:?\\s*(?:up to\\s?)?(?:(?:${CODE})\\s?)?(?:${SYM})?\\s?$`,
  "i",
);

function num(s: string): number {
  const t = s.replace(/\s/g, "");
  if (/[kK]$/.test(t)) return Math.round(Number(t.slice(0, -1).replace(/,/g, "")) * 1000);
  // «86.000» (европейский разделитель тысяч) против «275,840.00» (центы)
  if (/^\d{2,3}(\.\d{3})+$/.test(t)) return Number(t.replace(/\./g, ""));
  return Math.round(Number(t.replace(/,/g, "")));
}

function periodOf(fragment: string, max: number): SalaryPeriod {
  if (/(\/|per)\s?(hour|hr|h)\b|hourly|в час/i.test(fragment)) return "HOUR";
  if (/(\/|per)\s?(month|mo)\b|monthly|в месяц|мес\b/i.test(fragment)) return "MONTH";
  if (/(\/|per)\s?(year|yr|annum)\b|annual|yearly|в год/i.test(fragment)) return "YEAR";
  if (max < 1500) return "HOUR";
  if (max < 15000) return "MONTH";
  return "YEAR";
}

function plausible(min: number, max: number, period: SalaryPeriod, currency: string): boolean {
  if (!(min > 0) || !(max > 0) || max < min) return false;
  if (max / min > 3) return false;
  // Рубли, рупии и иены крупнее: месячная зарплата в рублях это сотни тысяч
  const big = currency === "RUB" || currency === "INR" || currency === "JPY" || currency === "CZK" || currency === "HUF";
  if (period === "YEAR") return min >= 10_000 && max <= (big ? 60_000_000 : 3_000_000);
  if (period === "MONTH") return min >= 300 && max <= (big ? 3_000_000 : 150_000);
  return min >= 5 && max <= (big ? 20_000 : 1_000);
}

type Candidate = TextSalary & { index: number };

function candidateFrom(m: RegExpExecArray, text: string): Candidate | null {
  const g = m.groups ?? {};
  const index = m.index;
  const before = text.slice(Math.max(0, index - 220), index);
  const after = text.slice(index + m[0].length, index + m[0].length + 40);
  // Подпись смотрим прямо перед числом (для SINGLE совпадение начинается со слова про зарплату)
  const inner = m[0].slice(0, Math.max(0, m[0].lastIndexOf(g.num1)));
  if (NEGATIVE_LABEL.test((before + inner).slice(-30))) return null;

  const code = (g.code2 ?? g.code1)?.toUpperCase();
  const sym = g.sym1 ?? g.sym1b ?? g.sym2 ?? g.sym2b;
  const currency = code ?? (sym ? SYM_CUR[sym] : undefined);
  if (!currency) return null; // число без валюты: годы, проценты, количество сотрудников

  const explicit = Boolean(code) || /\b(base|salary|per year|per annum|\/year|\/yr|annual)\b/i.test(m[0] + after);
  if (!explicit && !POSITIVE.test(before) && !POSITIVE.test(after)) return null;

  const v1 = num(g.num1);
  const v2 = g.num2 ? num(g.num2) : null;
  const max = v2 ? Math.max(v1, v2) : v1;
  const min = v2 ? Math.min(v1, v2) : g.upto ? null : v1;
  const period = periodOf(m[0] + after.slice(0, 14), max);
  // Для рублей месячный оклад обычно от 30 000, годовой формат там редкость
  const fixedPeriod = currency === "RUB" && period === "YEAR" && max < 1_500_000 ? "MONTH" : period;
  if (!plausible(min ?? max, max, fixedPeriod, currency)) return null;
  // Без единицы времени двузначные числа это не зарплата («$50 gift card»)
  if (fixedPeriod === "HOUR" && !/(\/|per)\s?(hour|hr|h)\b|hourly|в час/i.test(m[0] + after.slice(0, 14))) return null;
  return { min, max, currency, period: fixedPeriod, index };
}

/** Зарплата из текста описания (без HTML). null, если ничего правдоподобного нет. */
export function salaryFromDescription(text: string | null | undefined): TextSalary | null {
  if (!text) return null;
  const t = text.replace(/\s+/g, " ");
  if (t.length < 20) return null;
  const found: Candidate[] = [];
  for (const m of t.matchAll(RANGE)) {
    const c = candidateFrom(m as RegExpExecArray, t);
    if (c) found.push(c);
  }
  if (!found.length) {
    for (const m of t.matchAll(SINGLE)) {
      const c = candidateFrom(m as RegExpExecArray, t);
      if (c) found.push(c);
    }
  }
  if (!found.length) return null;
  // Несколько диапазонов (по странам или зонам): предпочитаем USD, иначе первый
  const pick = found.find((c) => c.currency === "USD") ?? found[0];
  return { min: pick.min, max: pick.max, currency: pick.currency, period: pick.period };
}
