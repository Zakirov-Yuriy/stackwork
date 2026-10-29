import Link from "next/link";
import type { VacancyCard as VacancyCardData } from "@/lib/vacancies";
import { GRADE_LABEL, WORK_FORMAT_SHORT, LANGUAGE_LABEL, formatSalary, formatRelative, formatLocation, periodSuffix } from "@/lib/labels";
import { SaveButton } from "./save-button";
import { CompanyAvatar } from "./company-avatar";

export function Chip({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return <span className={dark ? "chip-blue" : "chip-flat"}>{children}</span>;
}

export function SkillTag({ children, href }: { children: React.ReactNode; href?: string }) {
  if (href) {
    return (
      <Link href={href} className="neu-chip">
        {children}
      </Link>
    );
  }
  return <span className="neu-chip">{children}</span>;
}

export function VacancyCard({
  vacancy,
  now,
  saved = false,
  back = "/",
  from = "list",
}: {
  vacancy: VacancyCardData;
  now: Date;
  saved?: boolean;
  back?: string;
  /** С какого экрана открыли карточку: для статистики */
  from?: string;
}) {
  const href = `/vacancies/${vacancy.slug}?from=${from}`;
  const imported = vacancy.source !== "MANUAL";
  const hasSalary = Boolean(vacancy.salaryFrom || vacancy.salaryTo);
  return (
    <article className="neu-card-sm flex flex-col gap-3.5 px-6 py-5">
      <div className="flex flex-wrap items-start gap-4">
        <CompanyAvatar name={vacancy.company.name} logoUrl={vacancy.company.logoUrl} initials={vacancy.company.initials} size={48} rounded={12} />
        <div className="flex min-w-0 flex-[1_1_280px] flex-col gap-1">
          <Link href={href} className="text-lg font-extrabold leading-snug text-[color:var(--soft-text)] hover:text-[color:var(--soft-blue)]">
            {vacancy.title}
          </Link>
          <div className="text-sm text-[color:var(--soft-muted)]">
            {vacancy.company.name} · {formatLocation(vacancy.city, vacancy.workFormat, vacancy.locationNote)}
          </div>
        </div>
        <div className="whitespace-nowrap font-mono text-[17px] font-semibold text-[color:var(--soft-text)]">
          {formatSalary(vacancy.salaryFrom, vacancy.salaryTo, vacancy.currency)}
          <span className="font-sans text-sm font-semibold text-[color:var(--soft-muted)]">{periodSuffix(vacancy.salaryPeriod, hasSalary)}</span>
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

      <div className="flex flex-wrap items-center gap-2.5 pt-0.5">
        <Link href={imported ? href : `${href}#respond`} className="neu-primary-sm">
          {imported ? "Подробнее" : "Откликнуться"}
        </Link>
        <SaveButton vacancyId={vacancy.id} saved={saved} back={back} />
        <span className="ml-auto text-[13px] text-[color:var(--soft-muted)]">{vacancy.publishedAt ? formatRelative(vacancy.publishedAt, now) : ""}</span>
      </div>
    </article>
  );
}
