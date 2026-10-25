import Link from "next/link";
import type { VacancyCard as VacancyCardData } from "@/lib/vacancies";
import { GRADE_LABEL, WORK_FORMAT_SHORT, formatSalary, formatRelative, formatLocation } from "@/lib/labels";
import { BookmarkIcon } from "./icons";

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

export function VacancyCard({ vacancy, now }: { vacancy: VacancyCardData; now: Date }) {
  const href = `/vacancies/${vacancy.slug}`;
  return (
    <article className="neu-card-sm flex flex-col gap-3.5 px-6 py-5">
      <div className="flex flex-wrap items-start gap-4">
        <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-1">
          <Link href={href} className="text-lg font-extrabold leading-snug text-[color:var(--soft-text)] hover:text-[color:var(--soft-blue)]">
            {vacancy.title}
          </Link>
          <div className="text-sm text-[color:var(--soft-muted)]">
            {vacancy.company.name} · {formatLocation(vacancy.city, vacancy.workFormat)}
          </div>
        </div>
        <div className="whitespace-nowrap font-mono text-[17px] font-semibold text-[color:var(--soft-text)]">
          {formatSalary(vacancy.salaryFrom, vacancy.salaryTo, vacancy.currency)}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Chip dark>{GRADE_LABEL[vacancy.grade]}</Chip>
        <Chip>{WORK_FORMAT_SHORT[vacancy.workFormat]}</Chip>
        {vacancy.salaryType === "NET" && (vacancy.salaryFrom || vacancy.salaryTo) ? <Chip>На руки</Chip> : null}
        {vacancy.acceptsGithubLink ? <Chip>Отклик ссылкой на GitHub</Chip> : null}
        {vacancy.skills.map((s) => (
          <SkillTag key={s.skillId}>{s.skill.name}</SkillTag>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2.5 pt-0.5">
        <Link href={`${href}#respond`} className="neu-primary-sm">
          Откликнуться
        </Link>
        <button type="button" aria-label="Сохранить вакансию" className="neu-btn-sm h-11 w-11 px-0">
          <BookmarkIcon />
        </button>
        <span className="ml-auto text-[13px] text-[color:var(--soft-muted)]">{vacancy.publishedAt ? formatRelative(vacancy.publishedAt, now) : ""}</span>
      </div>
    </article>
  );
}
