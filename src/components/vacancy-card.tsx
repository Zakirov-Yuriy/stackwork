import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import type { VacancyCard as VacancyCardData } from "@/lib/vacancies";
import { makeLabels } from "@/lib/labels";
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
  const t = useTranslations("home.card");
  const tc = useTranslations("common");
  const L = makeLabels(useLocale() as Locale);
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
            {vacancy.company.name} · {L.formatLocation(vacancy.city, vacancy.workFormat, vacancy.locationNote)}
          </div>
        </div>
        <div className="whitespace-nowrap font-mono text-[17px] font-semibold text-[color:var(--soft-text)]">
          {L.formatSalary(vacancy.salaryFrom, vacancy.salaryTo, vacancy.currency)}
          <span className="font-sans text-sm font-semibold text-[color:var(--soft-muted)]">{L.periodSuffix(vacancy.salaryPeriod, hasSalary)}</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Chip dark>{L.GRADE_LABEL[vacancy.grade]}</Chip>
        <Chip>{L.WORK_FORMAT_SHORT[vacancy.workFormat]}</Chip>
        {!imported && vacancy.salaryType === "NET" && hasSalary ? <Chip>{t("net")}</Chip> : null}
        {vacancy.language !== "ru" ? <Chip>{L.LANGUAGE_LABEL[vacancy.language] ?? vacancy.language}</Chip> : null}
        {vacancy.acceptsGithubLink ? <Chip>{t("githubApply")}</Chip> : null}
        {vacancy.skills.map((s) => (
          <SkillTag key={s.skillId} href={`/jobs/${s.skill.slug}`}>
            {s.skill.name}
          </SkillTag>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2.5 pt-0.5">
        <Link href={imported ? href : `${href}#respond`} className="neu-primary-sm">
          {imported ? tc("actions.more") : t("apply")}
        </Link>
        <SaveButton vacancyId={vacancy.id} saved={saved} back={back} />
        <span className="ml-auto text-[13px] text-[color:var(--soft-muted)]">{vacancy.publishedAt ? L.formatRelative(vacancy.publishedAt, now) : ""}</span>
      </div>
    </article>
  );
}
