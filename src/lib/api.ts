import type { VacancyCard } from "@/lib/vacancies";
import {
  GRADE_LABEL,
  WORK_FORMAT_LABEL,
  EMPLOYMENT_LABEL,
  EXPERIENCE_LABEL,
  SALARY_TYPE_LABEL,
  formatSalary,
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
    },
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
      formatted: formatSalary(v.salaryFrom, v.salaryTo, v.currency),
    },
    skills: v.skills.map((s) => ({ slug: s.skill.slug, name: s.skill.name })),
    acceptsGithubLink: v.acceptsGithubLink,
    publishedAt: v.publishedAt?.toISOString() ?? null,
  };
}

export function jsonError(status: number, message: string) {
  return Response.json({ error: { status, message } }, { status });
}
