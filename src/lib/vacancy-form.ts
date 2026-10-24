import type { Grade, WorkFormat, Employment, ExperienceLevel, SalaryType } from "@/generated/prisma/client";

export const DIRECTIONS = [
  "Backend",
  "Frontend",
  "Fullstack",
  "Mobile",
  "DevOps / SRE",
  "Data / ML",
  "QA",
  "Аналитика",
  "Менеджмент",
  "Безопасность",
] as const;

export const CURRENCIES = ["RUB", "USD", "EUR"] as const;

const GRADES: Grade[] = ["JUNIOR", "MIDDLE", "SENIOR", "LEAD"];
const FORMATS: WorkFormat[] = ["REMOTE_OR_OFFICE", "REMOTE", "HYBRID", "OFFICE"];
const EMPLOYMENTS: Employment[] = ["FULL_TIME", "PART_TIME", "CONTRACT"];
const EXPERIENCES: ExperienceLevel[] = ["NONE", "ONE_TO_THREE", "THREE_TO_SIX", "SIX_PLUS"];
const SALARY_TYPES: SalaryType[] = ["NET", "GROSS"];

export type VacancyInput = {
  title: string;
  direction: string;
  experience: ExperienceLevel;
  grade: Grade;
  workFormat: WorkFormat;
  city: string | null;
  employment: Employment;
  salaryFrom: number | null;
  salaryTo: number | null;
  currency: string;
  salaryType: SalaryType;
  skills: string[]; // имена технологий как ввёл работодатель
  aboutTeam: string | null;
  responsibilities: string | null;
  requirements: string | null;
  niceToHave: string | null;
  conditions: string | null;
  acceptsGithubLink: boolean;
  showCompanyName: boolean;
};

export type VacancyFormValues = {
  [K in keyof VacancyInput]: VacancyInput[K] extends string[] ? string : string;
} & { acceptsGithubLink: string; showCompanyName: string };

function str(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
}

function num(fd: FormData, key: string): number | null {
  const raw = str(fd, key).replace(/[^\d]/g, "");
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function oneOf<T extends string>(value: string, allowed: readonly T[], fallback: T): T {
  return (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

export function parseSkills(raw: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of raw.split(/[,\n;]+/)) {
    const name = part.trim().replace(/\s+/g, " ");
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(name.slice(0, 40));
    if (out.length >= 20) break;
  }
  return out;
}

/** Разбор FormData формы вакансии в типизированные данные. Без валидации: только нормализация. */
export function parseVacancyForm(fd: FormData): VacancyInput {
  return {
    title: str(fd, "title").slice(0, 120),
    direction: oneOf(str(fd, "direction"), DIRECTIONS, "Backend"),
    experience: oneOf(str(fd, "experience"), EXPERIENCES, "THREE_TO_SIX"),
    grade: oneOf(str(fd, "grade"), GRADES, "MIDDLE"),
    workFormat: oneOf(str(fd, "workFormat"), FORMATS, "REMOTE_OR_OFFICE"),
    city: str(fd, "city").slice(0, 80) || null,
    employment: oneOf(str(fd, "employment"), EMPLOYMENTS, "FULL_TIME"),
    salaryFrom: num(fd, "salaryFrom"),
    salaryTo: num(fd, "salaryTo"),
    currency: oneOf(str(fd, "currency"), CURRENCIES, "RUB"),
    salaryType: oneOf(str(fd, "salaryType"), SALARY_TYPES, "NET"),
    skills: parseSkills(str(fd, "skills")),
    aboutTeam: str(fd, "aboutTeam").slice(0, 4000) || null,
    responsibilities: str(fd, "responsibilities").slice(0, 4000) || null,
    requirements: str(fd, "requirements").slice(0, 4000) || null,
    niceToHave: str(fd, "niceToHave").slice(0, 4000) || null,
    conditions: str(fd, "conditions").slice(0, 4000) || null,
    acceptsGithubLink: fd.get("acceptsGithubLink") === "on",
    showCompanyName: fd.get("showCompanyName") === "on",
  };
}

export type Check = { ok: boolean; text: string };

/**
 * Проверки перед отправкой на модерацию. Черновик можно сохранить с любыми ошибками,
 * на модерацию уходит только вакансия, где все проверки зелёные.
 */
export function moderationChecks(v: VacancyInput): Check[] {
  const hasSalary = Boolean(v.salaryFrom || v.salaryTo);
  const rangeOk = !v.salaryFrom || !v.salaryTo || v.salaryFrom <= v.salaryTo;
  const text = [v.title, v.aboutTeam, v.responsibilities, v.requirements, v.conditions].join(" ").toLowerCase();
  const discriminatory = /\b(до|от|младше|старше)\s*\d{2}\s*лет\b|\bтолько\s+(муж|жен)|\bпол:\s*(м|ж)/i.test(text);

  return [
    { ok: v.title.length >= 8, text: "Название вакансии от 8 символов" },
    { ok: hasSalary && rangeOk, text: hasSalary ? "Зарплатная вилка указана" : "Зарплатная вилка не указана: без неё не публикуем" },
    { ok: v.skills.length >= 3, text: v.skills.length >= 3 ? "Стек заполнен, минимум 3 технологии" : `Стек: ${v.skills.length} из 3 минимум` },
    {
      ok: Boolean(v.responsibilities && v.requirements),
      text: v.responsibilities && v.requirements ? "Разделы «задачи» и «что важно» заполнены" : "Разделы «задачи» и «что важно» пустые",
    },
    { ok: !discriminatory, text: discriminatory ? "Похоже на требования к возрасту или полу: они запрещены законом о занятости" : "Нет требований к возрасту и полу" },
  ];
}
