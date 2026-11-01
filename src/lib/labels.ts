import type {
  Grade,
  WorkFormat,
  Employment,
  ExperienceLevel,
  SalaryType,
  SalaryPeriod,
  ApplicationStatus,
  VacancySource,
} from "@/generated/prisma/client";
import { INTL_LOCALE, type Locale } from "@/i18n/routing";

/**
 * Подписи enum-значений и форматирование чисел, дат, зарплат с учётом языка.
 * На публичных страницах: const L = makeLabels(locale); L.GRADE_LABEL[v.grade], L.formatSalary(...).
 * Экспорты без префикса (GRADE_LABEL, formatSalary, ...) остаются русскими: для админки и API v1.
 */

/** Доски ATS: вакансия опубликована самим работодателем на его сайте */
export function isEmployerBoard(source: VacancySource): boolean {
  return source === "GREENHOUSE" || source === "LEVER" || source === "ASHBY";
}

/** Название языка вакансии на нём самом */
export const LANGUAGE_LABEL: Record<string, string> = { en: "English", de: "Deutsch", es: "Español", fr: "Français", pt: "Português", ru: "Русский" };

const CURRENCY_SIGN: Record<string, string> = {
  RUB: "₽",
  USD: "$",
  EUR: "€",
  GBP: "£",
  KZT: "₸",
  BYN: "Br",
  UAH: "₴",
  INR: "₹",
  CAD: "C$",
  AUD: "A$",
  CHF: "CHF",
  PLN: "zł",
  SGD: "S$",
};

export const GRADE_LABEL: Record<Grade, string> = {
  JUNIOR: "Junior",
  MIDDLE: "Middle",
  SENIOR: "Senior",
  LEAD: "Lead",
};

/** Русские склонения: plural(5, "вакансия", "вакансии", "вакансий") → "вакансий" */
export function plural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
}

type Dict = {
  SOURCE_LABEL: Record<VacancySource, string>;
  APPLICATION_STATUS_LABEL: Record<ApplicationStatus, string>;
  WORK_FORMAT_LABEL: Record<WorkFormat, string>;
  WORK_FORMAT_SHORT: Record<WorkFormat, string>;
  EMPLOYMENT_LABEL: Record<Employment, string>;
  EXPERIENCE_LABEL: Record<ExperienceLevel, string>;
  EXPERIENCE_SHORT: Record<ExperienceLevel, string>;
  SALARY_TYPE_LABEL: Record<SalaryType, string>;
  SALARY_PERIOD_LABEL: Record<SalaryPeriod, string>;
  salary: { from: string; to: string; none: string };
  relative: { justNow: string; yesterday: string; hoursAgo: (n: number) => string; daysAgo: (n: number) => string };
  vacancies: (n: number, formatted: string) => string;
  location: {
    remote: string;
    remoteRu: string;
    remoteOrOffice: string;
    hybrid: string;
    office: string;
    cityRemote: string; // «удалённо» после города
    cityRemoteOk: string; // «можно удалённо»
    cityHybrid: string;
  };
};

const DICT: Record<Locale, Dict> = {
  ru: {
    SOURCE_LABEL: {
      MANUAL: "",
      REMOTIVE: "Remotive",
      JOBICY: "Jobicy",
      REMOTEOK: "Remote OK",
      HIMALAYAS: "Himalayas",
      ARBEITNOW: "Arbeitnow",
      GREENHOUSE: "сайт работодателя",
      LEVER: "сайт работодателя",
      ASHBY: "сайт работодателя",
    },
    APPLICATION_STATUS_LABEL: { NEW: "новый", VIEWED: "просмотрен", INTERVIEW: "приглашение на интервью", OFFER: "оффер", REJECTED: "отказ" },
    WORK_FORMAT_LABEL: { REMOTE: "Удалённо", HYBRID: "Гибрид", OFFICE: "Офис", REMOTE_OR_OFFICE: "Удалённо или офис" },
    WORK_FORMAT_SHORT: { REMOTE: "Удалённо", HYBRID: "Гибрид", OFFICE: "Офис", REMOTE_OR_OFFICE: "Удалённо" },
    EMPLOYMENT_LABEL: { FULL_TIME: "Полная занятость", PART_TIME: "Частичная занятость", CONTRACT: "Проект или контракт" },
    EXPERIENCE_LABEL: { NONE: "Без опыта", ONE_TO_THREE: "1 до 3 лет", THREE_TO_SIX: "3 до 6 лет", SIX_PLUS: "Больше 6 лет" },
    EXPERIENCE_SHORT: { NONE: "Без опыта", ONE_TO_THREE: "Опыт 1–3 года", THREE_TO_SIX: "Опыт 3–6 лет", SIX_PLUS: "Опыт от 6 лет" },
    SALARY_TYPE_LABEL: { NET: "на руки", GROSS: "до вычета" },
    SALARY_PERIOD_LABEL: { MONTH: "в месяц", YEAR: "в год", HOUR: "в час" },
    salary: { from: "от", to: "до", none: "Зарплата не указана" },
    relative: {
      justNow: "Только что",
      yesterday: "Вчера",
      hoursAgo: (n) => `${n} ${plural(n, "час", "часа", "часов")} назад`,
      daysAgo: (n) => `${n} ${plural(n, "день", "дня", "дней")} назад`,
    },
    vacancies: (n, formatted) => `${formatted} ${plural(n, "вакансия", "вакансии", "вакансий")}`,
    location: {
      remote: "Удалённо",
      remoteRu: "Удалённо (РФ)",
      remoteOrOffice: "Удалённо или офис",
      hybrid: "Гибрид",
      office: "Офис",
      cityRemote: "удалённо",
      cityRemoteOk: "можно удалённо",
      cityHybrid: "гибрид",
    },
  },
  en: {
    SOURCE_LABEL: {
      MANUAL: "",
      REMOTIVE: "Remotive",
      JOBICY: "Jobicy",
      REMOTEOK: "Remote OK",
      HIMALAYAS: "Himalayas",
      ARBEITNOW: "Arbeitnow",
      GREENHOUSE: "employer's website",
      LEVER: "employer's website",
      ASHBY: "employer's website",
    },
    APPLICATION_STATUS_LABEL: { NEW: "new", VIEWED: "viewed", INTERVIEW: "interview invitation", OFFER: "offer", REJECTED: "rejected" },
    WORK_FORMAT_LABEL: { REMOTE: "Remote", HYBRID: "Hybrid", OFFICE: "On-site", REMOTE_OR_OFFICE: "Remote or on-site" },
    WORK_FORMAT_SHORT: { REMOTE: "Remote", HYBRID: "Hybrid", OFFICE: "On-site", REMOTE_OR_OFFICE: "Remote" },
    EMPLOYMENT_LABEL: { FULL_TIME: "Full-time", PART_TIME: "Part-time", CONTRACT: "Contract" },
    EXPERIENCE_LABEL: { NONE: "No experience", ONE_TO_THREE: "1 to 3 years", THREE_TO_SIX: "3 to 6 years", SIX_PLUS: "Over 6 years" },
    EXPERIENCE_SHORT: { NONE: "No experience", ONE_TO_THREE: "1–3 years", THREE_TO_SIX: "3–6 years", SIX_PLUS: "6+ years" },
    SALARY_TYPE_LABEL: { NET: "net", GROSS: "gross" },
    SALARY_PERIOD_LABEL: { MONTH: "per month", YEAR: "per year", HOUR: "per hour" },
    salary: { from: "from", to: "up to", none: "Salary not specified" },
    relative: {
      justNow: "Just now",
      yesterday: "Yesterday",
      hoursAgo: (n) => `${n} ${n === 1 ? "hour" : "hours"} ago`,
      daysAgo: (n) => `${n} ${n === 1 ? "day" : "days"} ago`,
    },
    vacancies: (n, formatted) => `${formatted} ${n === 1 ? "job" : "jobs"}`,
    location: {
      remote: "Remote",
      remoteRu: "Remote (Russia)",
      remoteOrOffice: "Remote or on-site",
      hybrid: "Hybrid",
      office: "On-site",
      cityRemote: "remote",
      cityRemoteOk: "remote possible",
      cityHybrid: "hybrid",
    },
  },
};

export function makeLabels(locale: Locale) {
  const d = DICT[locale] ?? DICT.ru;
  const intl = INTL_LOCALE[locale] ?? "ru-RU";
  const nf = new Intl.NumberFormat(intl);
  const dayMonth = new Intl.DateTimeFormat(intl, { day: "numeric", month: "long" });

  /** Подпись периода только когда он не месячный: «$120 000 – 160 000 в год» */
  const periodSuffix = (period: SalaryPeriod | null | undefined, hasSalary: boolean): string => {
    if (!hasSalary || !period || period === "MONTH") return "";
    return ` ${d.SALARY_PERIOD_LABEL[period]}`;
  };

  const formatSalary = (from: number | null, to: number | null, currency = "RUB"): string => {
    const sign = CURRENCY_SIGN[currency] ?? currency;
    if (from && to) return `${nf.format(from)} – ${nf.format(to)} ${sign}`;
    if (from) return `${d.salary.from} ${nf.format(from)} ${sign}`;
    if (to) return `${d.salary.to} ${nf.format(to)} ${sign}`;
    return d.salary.none;
  };

  /** «2 часа назад», «Вчера», «3 дня назад», «12 октября» */
  const formatRelative = (date: Date, now = new Date()): string => {
    const diffMs = now.getTime() - date.getTime();
    const hours = Math.floor(diffMs / 3_600_000);
    if (hours < 1) return d.relative.justNow;
    if (hours < 24) return d.relative.hoursAgo(hours);
    const days = Math.floor(hours / 24);
    if (days === 1) return d.relative.yesterday;
    if (days < 7) return d.relative.daysAgo(days);
    return dayMonth.format(date);
  };

  const formatDate = (date: Date): string => dayMonth.format(date);

  /** «1 248 вакансий» / "1,248 jobs" */
  const formatVacancyCount = (n: number): string => d.vacancies(n, nf.format(n));

  /** Место работы для карточки: «Москва · можно удалённо», «Удалённо · Europe, USA», «Удалённо (РФ)» */
  const formatLocation = (city: string | null, format: WorkFormat, note?: string | null): string => {
    const l = d.location;
    if (format === "REMOTE" && note) return city ? `${city} · ${l.cityRemote} · ${note}` : `${l.remote} · ${note}`;
    if (format === "REMOTE") return city ? `${city} · ${l.cityRemote}` : l.remoteRu;
    if (format === "REMOTE_OR_OFFICE") return city ? `${city} · ${l.cityRemoteOk}` : l.remoteOrOffice;
    if (format === "HYBRID") return city ? `${city} · ${l.cityHybrid}` : l.hybrid;
    return city ?? l.office;
  };

  return {
    locale,
    GRADE_LABEL,
    LANGUAGE_LABEL,
    SOURCE_LABEL: d.SOURCE_LABEL,
    APPLICATION_STATUS_LABEL: d.APPLICATION_STATUS_LABEL,
    WORK_FORMAT_LABEL: d.WORK_FORMAT_LABEL,
    WORK_FORMAT_SHORT: d.WORK_FORMAT_SHORT,
    EMPLOYMENT_LABEL: d.EMPLOYMENT_LABEL,
    EXPERIENCE_LABEL: d.EXPERIENCE_LABEL,
    EXPERIENCE_SHORT: d.EXPERIENCE_SHORT,
    SALARY_TYPE_LABEL: d.SALARY_TYPE_LABEL,
    SALARY_PERIOD_LABEL: d.SALARY_PERIOD_LABEL,
    nf,
    periodSuffix,
    formatSalary,
    formatRelative,
    formatDate,
    formatVacancyCount,
    formatLocation,
    isEmployerBoard,
    plural,
  };
}

export type Labels = ReturnType<typeof makeLabels>;

// Русские подписи без привязки к запросу: админка, API v1, письма
const ru = makeLabels("ru");
export const SOURCE_LABEL = ru.SOURCE_LABEL;
export const APPLICATION_STATUS_LABEL = ru.APPLICATION_STATUS_LABEL;
export const WORK_FORMAT_LABEL = ru.WORK_FORMAT_LABEL;
export const WORK_FORMAT_SHORT = ru.WORK_FORMAT_SHORT;
export const EMPLOYMENT_LABEL = ru.EMPLOYMENT_LABEL;
export const EXPERIENCE_LABEL = ru.EXPERIENCE_LABEL;
export const EXPERIENCE_SHORT = ru.EXPERIENCE_SHORT;
export const SALARY_TYPE_LABEL = ru.SALARY_TYPE_LABEL;
export const SALARY_PERIOD_LABEL = ru.SALARY_PERIOD_LABEL;
export const periodSuffix = ru.periodSuffix;
export const formatSalary = ru.formatSalary;
export const formatRelative = ru.formatRelative;
export const formatDate = ru.formatDate;
export const formatVacancyCount = ru.formatVacancyCount;
export const formatLocation = ru.formatLocation;
