import type { NextRequest } from "next/server";
import type { VacancyCard } from "@/lib/vacancies";
import { getCurrentUser } from "@/lib/session";
import {
  GRADE_LABEL,
  WORK_FORMAT_LABEL,
  EMPLOYMENT_LABEL,
  EXPERIENCE_LABEL,
  SALARY_TYPE_LABEL,
  SOURCE_LABEL,
  formatSalary,
  periodSuffix,
} from "@/lib/labels";

/**
 * Форма вакансии для публичного API v1.
 * Поля стабильны: Flutter-приложение завязано на них.
 * Enum-значения отдаём как есть плюс готовые русские подписи.
 */
export function toVacancyDto(v: VacancyCard) {
  return {
    id: v.id,
    slug: v.slug,
    title: v.title,
    company: {
      slug: v.company.slug,
      name: v.company.name,
      initials: v.company.initials,
      logoUrl: v.company.logoUrl,
    },
    // Откуда вакансия: MANUAL (работодатель на Stackwork) или площадка-источник
    source: v.source,
    sourceLabel: SOURCE_LABEL[v.source] || null,
    externalUrl: v.externalUrl,
    applyUrl: v.applyUrl,
    language: v.language,
    locationNote: v.locationNote,
    direction: v.direction,
    grade: v.grade,
    gradeLabel: GRADE_LABEL[v.grade],
    experience: v.experience,
    experienceLabel: EXPERIENCE_LABEL[v.experience],
    workFormat: v.workFormat,
    workFormatLabel: WORK_FORMAT_LABEL[v.workFormat],
    employment: v.employment,
    employmentLabel: EMPLOYMENT_LABEL[v.employment],
    city: v.city,
    salary: {
      from: v.salaryFrom,
      to: v.salaryTo,
      currency: v.currency,
      type: v.salaryType,
      typeLabel: SALARY_TYPE_LABEL[v.salaryType],
      period: v.salaryPeriod,
      formatted: `${formatSalary(v.salaryFrom, v.salaryTo, v.currency)}${periodSuffix(v.salaryPeriod, Boolean(v.salaryFrom || v.salaryTo))}`,
    },
    skills: v.skills.map((s) => ({ slug: s.skill.slug, name: s.skill.name })),
    acceptsGithubLink: v.acceptsGithubLink,
    publishedAt: v.publishedAt?.toISOString() ?? null,
  };
}

export function jsonError(status: number, message: string) {
  return Response.json({ error: { status, message } }, { status });
}

/** Пользователь по заголовку Authorization: Bearer <JWT> (тот же токен, что в cookie сайта). */
export async function apiUser(request: NextRequest | Request) {
  return getCurrentUser(request.headers.get("authorization"));
}

/** Тело запроса как объект; пустое или битое тело даёт {} */
export async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const data = (await request.json()) as unknown;
    return data && typeof data === "object" ? (data as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export function str(v: unknown, max = 500): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

export function toUserDto(u: { id: string; email: string; name: string | null; role: string; emailVerifiedAt: Date | null; company?: { slug: string; name: string } | null }) {
  return { id: u.id, email: u.email, name: u.name, role: u.role, emailVerified: Boolean(u.emailVerifiedAt), company: u.company ? { slug: u.company.slug, name: u.company.name } : null };
}
