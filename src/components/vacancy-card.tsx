import Link from "next/link";
import type { VacancyCard as VacancyCardData } from "@/lib/vacancies";
import {
  GRADE_LABEL,
  WORK_FORMAT_SHORT,
  SALARY_TYPE_LABEL,
  LANGUAGE_LABEL,
  formatSalary,
  formatRelative,
  formatLocation,
  periodSuffix,
} from "@/lib/labels";
import { BookmarkIcon } from "./icons";
import { CompanyAvatar } from "./company-avatar";

export function Chip({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <span
      className={`rounded-md px-2.5 py-1 text-xs font-bold ${dark ? "bg-ink text-white" : "bg-soft text-ink-2"}`}
    >
      {children}
    </span>
  );
}

export function SkillTag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-line px-2.5 py-1 font-mono text-xs text-ink-2">{children}</span>
  );
}

export function VacancyCard({ vacancy, now, from = "list" }: { vacancy: VacancyCardData; now: Date; from?: string }) {
  const href = `/vacancies/${vacancy.slug}?from=${from}`;
  const imported = vacancy.source !== "MANUAL";
  const hasSalary = Boolean(vacancy.salaryFrom || vacancy.salaryTo);
  return (
    <article className="flex flex-col gap-3 rounded-xl border border-line bg-card px-[22px] py-5 hover:border-ink">
      <div className="flex flex-wrap items-start gap-4">
        <CompanyAvatar name={vacancy.company.name} logoUrl={vacancy.company.logoUrl} initials={vacancy.company.initials} size={48} />
        <div className="flex min-w-0 flex-[1_1_300px] flex-col gap-1">
          <Link href={href} className="text-lg font-extrabold leading-snug text-ink hover:underline">
            {vacancy.title}
          </Link>
          <div className="text-sm text-muted">
            {vacancy.company.name} · {formatLocation(vacancy.city, vacancy.workFormat, vacancy.locationNote)}
          </div>
        </div>
        <div className="whitespace-nowrap font-mono text-[17px] font-semibold">
          {formatSalary(vacancy.salaryFrom, vacancy.salaryTo, vacancy.currency)}
          <span className="font-sans text-sm font-semibold text-muted">{periodSuffix(vacancy.salaryPeriod, hasSalary)}</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Chip dark>{GRADE_LABEL[vacancy.grade]}</Chip>
        <Chip>{WORK_FORMAT_SHORT[vacancy.workFormat]}</Chip>
        {!imported && vacancy.salaryType === "NET" && hasSalary ? <Chip>На руки</Chip> : null}
        {vacancy.language !== "ru" ? <Chip>{LANGUAGE_LABEL[vacancy.language] ?? vacancy.language}</Chip> : null}
        {vacancy.acceptsGithubLink ? <Chip>Отклик ссылкой на GitHub</Chip> : null}
        {vacancy.skills.map((s) => (
          <SkillTag key={s.skillId}>{s.skill.name}</SkillTag>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <Link
          href={imported ? href : `${href}#respond`}
          className="inline-flex min-h-11 items-center rounded-lg bg-accent px-[18px] text-sm font-extrabold text-ink hover:brightness-95"
        >
          {imported ? "Подробнее" : "Откликнуться"}
        </Link>
        <button
          type="button"
          aria-label="Сохранить вакансию"
          className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-line-2 bg-card hover:border-ink"
        >
          <BookmarkIcon />
        </button>
        <span className="ml-auto text-[13px] text-muted-2">
          {vacancy.publishedAt ? formatRelative(vacancy.publishedAt, now) : ""}
        </span>
        <span className="sr-only">{SALARY_TYPE_LABEL[vacancy.salaryType]}</span>
      </div>
    </article>
  );
}
