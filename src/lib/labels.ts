import type {
  Grade,
  WorkFormat,
  Employment,
  ExperienceLevel,
  SalaryType,
} from "@/generated/prisma/client";

export const GRADE_LABEL: Record<Grade, string> = {
  JUNIOR: "Junior",
  MIDDLE: "Middle",
  SENIOR: "Senior",
  LEAD: "Lead",
};

export const WORK_FORMAT_LABEL: Record<WorkFormat, string> = {
  REMOTE: "Удалённо",
  HYBRID: "Гибрид",
  OFFICE: "Офис",
  REMOTE_OR_OFFICE: "Удалённо или офис",
};

/** Короткая метка для карточки в списке */
export const WORK_FORMAT_SHORT: Record<WorkFormat, string> = {
  REMOTE: "Удалённо",
  HYBRID: "Гибрид",
  OFFICE: "Офис",
  REMOTE_OR_OFFICE: "Удалённо",
};

export const EMPLOYMENT_LABEL: Record<Employment, string> = {
  FULL_TIME: "Полная занятость",
  PART_TIME: "Частичная занятость",
  CONTRACT: "Проект или контракт",
};

export const EXPERIENCE_LABEL: Record<ExperienceLevel, string> = {
  NONE: "Без опыта",
  ONE_TO_THREE: "1 до 3 лет",
  THREE_TO_SIX: "3 до 6 лет",
  SIX_PLUS: "Больше 6 лет",
};

export const EXPERIENCE_SHORT: Record<ExperienceLevel, string> = {
  NONE: "Без опыта",
  ONE_TO_THREE: "Опыт 1–3 года",
  THREE_TO_SIX: "Опыт 3–6 лет",
  SIX_PLUS: "Опыт от 6 лет",
};

export const SALARY_TYPE_LABEL: Record<SalaryType, string> = {
  NET: "на руки",
  GROSS: "до вычета",
};

const CURRENCY_SIGN: Record<string, string> = {
  RUB: "₽",
  USD: "$",
  EUR: "€",
};

const nf = new Intl.NumberFormat("ru-RU");

export function formatSalary(
  from: number | null,
  to: number | null,
  currency = "RUB",
): string {
  const sign = CURRENCY_SIGN[currency] ?? currency;
  if (from && to) return `${nf.format(from)} – ${nf.format(to)} ${sign}`;
  if (from) return `от ${nf.format(from)} ${sign}`;
  if (to) return `до ${nf.format(to)} ${sign}`;
  return "Зарплата не указана";
}

/** «2 часа назад», «Вчера», «3 дня назад», «12 октября» */
export function formatRelative(date: Date, now = new Date()): string {
  const diffMs = now.getTime() - date.getTime();
  const hours = Math.floor(diffMs / 3_600_000);
  if (hours < 1) return "Только что";
  if (hours < 24) return `${hours} ${plural(hours, "час", "часа", "часов")} назад`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Вчера";
  if (days < 7) return `${days} ${plural(days, "день", "дня", "дней")} назад`;
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" }).format(date);
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" }).format(date);
}

export function plural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
}

/** «1 248 вакансий» */
export function formatVacancyCount(n: number): string {
  return `${nf.format(n)} ${plural(n, "вакансия", "вакансии", "вакансий")}`;
}

/** Место работы для карточки: «Москва · можно удалённо», «Удалённо (РФ)» */
export function formatLocation(city: string | null, format: WorkFormat): string {
  if (format === "REMOTE") return city ? `${city} · удалённо` : "Удалённо (РФ)";
  if (format === "REMOTE_OR_OFFICE") return city ? `${city} · можно удалённо` : "Удалённо или офис";
  if (format === "HYBRID") return city ? `${city} · гибрид` : "Гибрид";
  return city ?? "Офис";
}
