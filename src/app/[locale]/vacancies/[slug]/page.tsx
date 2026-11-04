import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { languageAlternates, localizedPath } from "@/i18n/seo";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Chip, SkillTag } from "@/components/vacancy-card";
import { SaveButton } from "@/components/save-button";
import { ShareButton } from "@/components/share-button";
import { savedIdsFor } from "@/lib/saved";
import { getVacancyBySlug, similarVacancies, countCompanyVacancies } from "@/lib/vacancies";
import { getCurrentUser } from "@/lib/session";
import { db } from "@/lib/db";
import { ApplyForm } from "./apply-form";
import { turnstileSiteKey } from "@/lib/turnstile";
import { VerifyBanner } from "@/components/verify-banner";
import { CompanyAvatar } from "@/components/company-avatar";
import { ExternalApply, SourceLine } from "./external";
import { JsonLd } from "@/components/json-ld";
import { jobPostingJsonLd } from "@/lib/seo/job-posting";
import { makeLabels } from "@/lib/labels";

const loadVacancy = cache(getVacancyBySlug);

const muted = "text-[color:var(--soft-muted)]";
const text = "text-[color:var(--soft-text)]";

export async function generateMetadata(props: PageProps<"/[locale]/vacancies/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const [v, t, locale] = await Promise.all([loadVacancy(slug), getTranslations("vacancy"), getLocale() as Promise<Locale>]);
  if (!v) return { title: t("meta.notFound") };
  if (v.status === "ARCHIVED") return { title: `${v.title}, ${v.company.name}`, description: t("closed.text"), robots: { index: false, follow: true } };
  const L = makeLabels(locale);
  const salary = L.formatSalary(v.salaryFrom, v.salaryTo, v.currency);
  const description = `${salary} ${L.SALARY_TYPE_LABEL[v.salaryType]} · ${L.GRADE_LABEL[v.grade]} · ${L.WORK_FORMAT_LABEL[v.workFormat]}. ${v.skills.map((s) => s.skill.name).join(", ")}`;
  const path = `/vacancies/${v.slug}`;
  return {
    title: `${v.title}, ${v.company.name}`,
    description,
    alternates: languageAlternates(path, locale),
    openGraph: {
      type: "article",
      title: `${v.title} · ${v.company.name}`,
      description,
      url: localizedPath(path, locale),
      images: [{ url: `/api/og/vacancy/${v.slug}`, width: 1200, height: 630, alt: v.title }],
    },
    twitter: { card: "summary_large_image" },
  };
}

function Lines({ text: t }: { text: string }) {
  const items = t
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  return (
    <ul className="m-0 flex list-disc flex-col gap-1 pl-[22px]">
      {items.map((line, i) => (
        <li key={i}>{line}</li>
      ))}
    </ul>
  );
}

function Paragraphs({ text: t }: { text: string }) {
  return (
    <>
      {t
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .filter(Boolean)
        .map((p, i) => (
          <p key={i} className="m-0">
            {p}
          </p>
        ))}
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <h2 className="m-0 text-lg font-extrabold">{title}</h2>
      {children}
    </div>
  );
}

export default async function VacancyPage(props: PageProps<"/[locale]/vacancies/[slug]">) {
  const { slug } = await props.params;
  const v = await loadVacancy(slug);
  if (!v) notFound();
  const closed = v.status === "ARCHIVED";

  const now = new Date();
  const [user, t, locale] = await Promise.all([getCurrentUser(), getTranslations("vacancy"), getLocale() as Promise<Locale>]);
  const L = makeLabels(locale);
  // Счётчик просмотров: без ожидания, ошибки не влияют на страницу
  db.vacancy.update({ where: { id: v.id }, data: { views: { increment: 1 } } }).catch(() => {});

  const [similar, openCount, myApplication, saved] = await Promise.all([
    similarVacancies(
      v.id,
      v.skills.map((s) => s.skillId),
    ),
    countCompanyVacancies(v.companyId),
    user?.role === "CANDIDATE"
      ? db.application.findUnique({
          where: { vacancyId_candidateId: { vacancyId: v.id, candidateId: user.id } },
          select: { status: true, createdAt: true },
        })
      : null,
    savedIdsFor(user?.id, [v.id]),
  ]);

  const salary = L.formatSalary(v.salaryFrom, v.salaryTo, v.currency);
  const hasSalary = Boolean(v.salaryFrom || v.salaryTo);
  const respondHref = `/vacancies/${v.slug}#respond`;
  const imported = v.source !== "MANUAL";
  const applyHref = imported ? v.applyUrl ?? v.externalUrl ?? "#" : respondHref;

  return (
    <>
      <SiteHeader />
      {!closed ? <JsonLd data={jobPostingJsonLd(v)} /> : null}

      <main className="mx-auto box-border flex w-full max-w-[1180px] flex-col gap-6 px-6 pb-14 pt-4">
        <nav aria-label={t("breadcrumbs.label")} className={`flex flex-wrap items-center gap-2 text-[13px] ${muted}`}>
          <Link href="/" className="hover:text-[color:var(--soft-text)]">
            {t("breadcrumbs.vacancies")}
          </Link>
          <span aria-hidden="true">/</span>
          <Link href={`/?q=${encodeURIComponent(v.direction)}`} className="hover:text-[color:var(--soft-text)]">
            {v.direction}
          </Link>
          {v.skills[0] ? (
            <>
              <span aria-hidden="true">/</span>
              <Link href={`/?skills=${v.skills[0].skill.slug}`} className="hover:text-[color:var(--soft-text)]">
                {v.skills[0].skill.name}
              </Link>
            </>
          ) : null}
          <span aria-hidden="true">/</span>
          <span className={text}>{v.title}</span>
        </nav>

        <div className="flex flex-wrap items-start gap-7">
          <article className="flex min-w-0 flex-[999_1_560px] flex-col gap-6">
            <section className="neu-card flex flex-col gap-5 p-8">
              <div className="flex flex-col gap-3">
                <h1 className={`m-0 text-[30px] font-extrabold leading-tight tracking-tight ${text}`}>{v.title}</h1>
                <div className="font-mono text-[22px] font-semibold">
                  {salary}{" "}
                  {hasSalary ? (
                    <span className={`font-sans text-sm font-semibold ${muted}`}>
                      {imported ? L.periodSuffix(v.salaryPeriod, hasSalary).trim() || L.SALARY_TYPE_LABEL[v.salaryType] : L.SALARY_TYPE_LABEL[v.salaryType]}
                    </span>
                  ) : null}
                </div>
                <div className={`flex flex-wrap items-center gap-2 text-[15px] ${muted}`}>
                  <a href="#company" className="soft-link">
                    {v.company.name}
                  </a>
                  <span aria-hidden="true">·</span>
                  <span>{L.formatLocation(v.city, v.workFormat, v.locationNote)}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Chip dark>{L.GRADE_LABEL[v.grade]}</Chip>
                <Chip>{L.WORK_FORMAT_LABEL[v.workFormat]}</Chip>
                <Chip>{L.EMPLOYMENT_LABEL[v.employment]}</Chip>
                {!imported ? <Chip>{L.EXPERIENCE_SHORT[v.experience]}</Chip> : null}
                {v.language !== "ru" ? <Chip>{L.LANGUAGE_LABEL[v.language] ?? v.language}</Chip> : null}
              </div>

              {closed ? (
                <div role="status" className="neu-inset flex flex-wrap items-center gap-3 rounded-2xl px-5 py-4">
                  <span className="text-[15px] font-extrabold text-[#b45309]">{t("closed.title")}</span>
                  <span className={`text-sm ${muted}`}>{t("closed.text")}</span>
                  <Link href="/" className="neu-primary-sm ml-auto" style={{ minHeight: 40, padding: "0 18px", fontSize: 14 }}>
                    {t("closed.cta")}
                  </Link>
                </div>
              ) : null}

              <div className="flex flex-wrap items-center gap-3 pt-1">
                {closed ? null : imported ? (
                  <ExternalApply href={applyHref} slug={v.slug} source={v.source} large />
                ) : (
                  <a href="#respond" className="neu-primary-sm" style={{ minHeight: 48, padding: "0 24px", fontSize: 15 }}>
                    {t("apply")}
                  </a>
                )}
                {closed ? null : <SaveButton vacancyId={v.id} saved={saved.has(v.id)} back={`/vacancies/${v.slug}`} withLabel />}
                <ShareButton title={v.title} path={`/vacancies/${v.slug}`} />
                {v.publishedAt ? (
                  <span className={`ml-auto text-[13px] ${muted}`}>
                    {t("published", { date: L.formatDate(v.publishedAt), relative: L.formatRelative(v.publishedAt, now) })}
                  </span>
                ) : null}
              </div>
            </section>

            <section className={`neu-card flex flex-col gap-6 p-8 text-[15px] leading-relaxed ${text}`}>
              {imported && v.descriptionHtml ? <div className="job-html" dangerouslySetInnerHTML={{ __html: v.descriptionHtml }} /> : null}
              {!imported && v.aboutTeam ? (
                <Section title={t("sections.aboutTeam")}>
                  <Paragraphs text={v.aboutTeam} />
                </Section>
              ) : null}
              {v.responsibilities ? (
                <Section title={t("sections.responsibilities")}>
                  <Lines text={v.responsibilities} />
                </Section>
              ) : null}
              {v.requirements ? (
                <Section title={t("sections.requirements")}>
                  <Lines text={v.requirements} />
                </Section>
              ) : null}
              {v.niceToHave ? (
                <Section title={t("sections.niceToHave")}>
                  <Lines text={v.niceToHave} />
                </Section>
              ) : null}
              {v.conditions ? (
                <Section title={t("sections.conditions")}>
                  <Lines text={v.conditions} />
                </Section>
              ) : null}
              {v.skills.length ? (
                <div className="flex flex-col gap-3">
                  <h2 className="m-0 text-lg font-extrabold">{t("sections.stack")}</h2>
                  <div className="flex flex-wrap gap-2.5">
                    {v.skills.map((s) => (
                      <SkillTag key={s.skillId} href={`/?skills=${s.skill.slug}`}>
                        {s.skill.name}
                      </SkillTag>
                    ))}
                  </div>
                </div>
              ) : null}
            </section>

            {closed ? null : imported ? (
              <section id="respond" className="neu-card flex flex-col gap-4 p-8">
                <div className="flex flex-wrap items-center gap-5">
                  <div className="flex flex-[1_1_320px] flex-col gap-1.5">
                    <h2 className="m-0 text-xl font-extrabold">{t("respond.title")}</h2>
                    <p className={`m-0 text-sm leading-relaxed ${muted}`}>{t("respond.external")}</p>
                  </div>
                  <ExternalApply href={applyHref} slug={v.slug} source={v.source} large />
                </div>
                <SourceLine source={v.source} url={v.externalUrl} companyName={v.company.name} />
                <Link href={`/report?vacancy=${v.slug}`} className={`self-start text-[13px] font-semibold ${muted} hover:text-[color:var(--soft-text)]`}>
                  {t("respond.report")}
                </Link>
              </section>
            ) : (
            <section id="respond" className="neu-card flex flex-col gap-5 p-8">
              <div className="flex flex-wrap items-center gap-5">
                <div className="flex flex-[1_1_320px] flex-col gap-1.5">
                  <h2 className="m-0 text-xl font-extrabold">{t("respond.title")}</h2>
                  <p className={`m-0 text-sm leading-relaxed ${muted}`}>{v.acceptsGithubLink ? t("respond.withGithub") : t("respond.resumeOnly")}</p>
                </div>
                {!user ? (
                  <div className="flex flex-wrap items-center gap-3">
                    <Link href={`/login?next=${encodeURIComponent(respondHref)}`} className="neu-primary-sm" style={{ minHeight: 48, padding: "0 24px", fontSize: 15 }}>
                      {t("respond.loginAndApply")}
                    </Link>
                    <Link href={`/register?next=${encodeURIComponent(respondHref)}`} className="soft-link text-sm">
                      {t("respond.register")}
                    </Link>
                  </div>
                ) : null}
              </div>

              {user?.role === "CANDIDATE" && myApplication ? (
                <div role="status" className="neu-inset rounded-xl px-4 py-3 text-sm font-semibold text-[#1F6F58]">
                  {t("respond.applied", { date: L.formatDate(myApplication.createdAt), status: L.APPLICATION_STATUS_LABEL[myApplication.status] })}{" "}
                  <Link href="/me" className="soft-link">
                    {t("respond.myApplications")}
                  </Link>
                </div>
              ) : user?.role === "CANDIDATE" && !user.emailVerifiedAt ? (
                <VerifyBanner user={user} what={t("respond.verifyWhat")} />
              ) : user?.role === "CANDIDATE" ? (
                <ApplyForm slug={v.slug} acceptsGithubLink={v.acceptsGithubLink} siteKey={turnstileSiteKey()} />
              ) : user ? (
                <p className={`m-0 text-sm ${muted}`}>{t("respond.employerAccount")}</p>
              ) : null}

              <Link href={`/report?vacancy=${v.slug}`} className={`self-start text-[13px] font-semibold ${muted} hover:text-[color:var(--soft-text)]`}>
                {t("respond.report")}
              </Link>
            </section>
            )}
          </article>

          <aside className="box-border flex max-w-[340px] flex-[1_1_300px] flex-col gap-5">
            <section id="company" className="neu-card flex flex-col gap-4 p-6">
              <div className="flex items-center gap-3.5">
                <CompanyAvatar name={v.company.name} logoUrl={v.company.logoUrl} initials={v.company.initials} size={52} />
                <div className="flex min-w-0 flex-col gap-0.5">
                  <Link href={`/companies/${v.company.slug}`} className={`text-[17px] font-extrabold ${text} hover:text-[color:var(--soft-blue)]`}>
                    {v.company.name}
                  </Link>
                  <span className={`text-[13px] ${muted}`}>{[v.company.industry, v.company.city].filter(Boolean).join(" · ")}</span>
                </div>
              </div>
              {v.company.description ? <p className={`m-0 text-sm leading-relaxed ${text}`}>{v.company.description}</p> : null}
              <div className="flex flex-wrap gap-4 text-sm">
                <Link href={`/?q=${encodeURIComponent(v.company.name)}`} className="soft-link">
                  {t("company.openCount", { count: openCount })}
                </Link>
                <Link href={`/companies/${v.company.slug}`} className="soft-link">
                  {t("company.about")}
                </Link>
              </div>
              {v.company.isExternal && !v.company.claimedAt ? (
                <Link href={`/companies/${v.company.slug}/claim`} className={`text-[13px] font-semibold ${muted} hover:text-[color:var(--soft-text)]`}>
                  {t("company.claim")}
                </Link>
              ) : null}
            </section>

            {!imported ? (
            <section className="neu-card flex flex-col gap-3 p-6">
              <h2 className="m-0 text-[15px] font-extrabold">{t("process.title")}</h2>
              <ol className={`m-0 flex list-decimal flex-col gap-1 pl-5 text-sm leading-relaxed ${text}`}>
                <li>{t("process.step1")}</li>
                <li>{t("process.step2")}</li>
                <li>{t("process.step3")}</li>
                <li>{t("process.step4")}</li>
              </ol>
            </section>
            ) : null}

            {similar.length ? (
              <section className="flex flex-col gap-3">
                <h2 className="m-0 mb-1 text-[15px] font-extrabold">{t("similar")}</h2>
                {similar.map((s) => (
                  <Link key={s.id} href={`/vacancies/${s.slug}?from=similar`} className={`neu-card-sm flex flex-col gap-1 p-5 ${text}`}>
                    <span className="text-[15px] font-extrabold leading-snug">{s.title}</span>
                    <span className="font-mono text-sm font-semibold">{L.formatSalary(s.salaryFrom, s.salaryTo, s.currency)}</span>
                    <span className={`text-[13px] ${muted}`}>
                      {s.company.name} · {L.formatLocation(s.city, s.workFormat, s.locationNote)}
                    </span>
                  </Link>
                ))}
              </section>
            ) : null}
          </aside>
        </div>
      </main>

      <SiteFooter compact />
    </>
  );
}
