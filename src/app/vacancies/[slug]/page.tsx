import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Chip } from "@/components/vacancy-card";
import { CompanyAvatar } from "@/components/company-avatar";
import { ExternalApply, SourceLine } from "./external";
import { BookmarkIcon, ShareIcon } from "@/components/icons";
import { getVacancyBySlug, similarVacancies, countCompanyVacancies } from "@/lib/vacancies";
import { getCurrentUser } from "@/lib/session";
import { db } from "@/lib/db";
import { ApplyForm } from "./apply-form";
import { APPLICATION_STATUS_LABEL } from "@/lib/labels";
import {
  GRADE_LABEL,
  WORK_FORMAT_LABEL,
  EMPLOYMENT_LABEL,
  EXPERIENCE_SHORT,
  SALARY_TYPE_LABEL,
  formatSalary,
  formatRelative,
  formatDate,
  formatLocation,
  periodSuffix,
  LANGUAGE_LABEL,
  plural,
} from "@/lib/labels";

// React.cache дедуплицирует запрос между generateMetadata и страницей
const loadVacancy = cache(getVacancyBySlug);

export async function generateMetadata(props: PageProps<"/vacancies/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const v = await loadVacancy(slug);
  if (!v) return { title: "Вакансия не найдена" };
  const salary = formatSalary(v.salaryFrom, v.salaryTo, v.currency);
  return {
    title: `${v.title}, ${v.company.name}`,
    description: `${salary} ${SALARY_TYPE_LABEL[v.salaryType]} · ${GRADE_LABEL[v.grade]} · ${WORK_FORMAT_LABEL[v.workFormat]}. ${v.skills.map((s) => s.skill.name).join(", ")}`,
  };
}

function Lines({ text }: { text: string }) {
  const items = text
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

function Paragraphs({ text }: { text: string }) {
  return (
    <>
      {text
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

export default async function VacancyPage(props: PageProps<"/vacancies/[slug]">) {
  const { slug } = await props.params;
  const v = await loadVacancy(slug);
  if (!v) notFound();

  const now = new Date();
  const user = await getCurrentUser();
  const [similar, openCount, myApplication] = await Promise.all([
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
  ]);

  const salary = formatSalary(v.salaryFrom, v.salaryTo, v.currency);
  const hasSalary = Boolean(v.salaryFrom || v.salaryTo);
  const imported = v.source !== "MANUAL";
  const applyHref = imported ? v.applyUrl ?? v.externalUrl ?? "#" : "#respond";

  return (
    <>
      <SiteHeader />

      <main className="mx-auto box-border flex w-full max-w-[1180px] flex-col gap-5 px-6 pb-12 pt-6">
        <nav aria-label="Хлебные крошки" className="flex flex-wrap items-center gap-2 text-[13px] text-muted">
          <Link href="/" className="hover:text-ink">
            Вакансии
          </Link>
          <span aria-hidden="true">/</span>
          <Link href={`/?q=${encodeURIComponent(v.direction)}`} className="hover:text-ink">
            {v.direction}
          </Link>
          {v.skills[0] ? (
            <>
              <span aria-hidden="true">/</span>
              <Link href={`/?skills=${v.skills[0].skill.slug}`} className="hover:text-ink">
                {v.skills[0].skill.name}
              </Link>
            </>
          ) : null}
          <span aria-hidden="true">/</span>
          <span className="text-ink">{v.title}</span>
        </nav>

        <div className="flex flex-wrap items-start gap-6">
          <article className="flex min-w-0 flex-[999_1_560px] flex-col gap-5">
            <section className="flex flex-col gap-[18px] rounded-xl border border-line bg-card p-7">
              <div className="flex flex-col gap-2.5">
                <h1 className="m-0 text-[30px] font-extrabold leading-tight tracking-tight">{v.title}</h1>
                <div className="font-mono text-[22px] font-semibold">
                  {salary}{" "}
                  {hasSalary ? (
                    <span className="font-sans text-sm font-semibold text-muted">
                      {imported ? periodSuffix(v.salaryPeriod, hasSalary).trim() || SALARY_TYPE_LABEL[v.salaryType] : SALARY_TYPE_LABEL[v.salaryType]}
                    </span>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-[15px] text-muted">
                  <a href="#company" className="font-bold text-link hover:text-ink">
                    {v.company.name}
                  </a>
                  <span aria-hidden="true">·</span>
                  <span>{formatLocation(v.city, v.workFormat, v.locationNote)}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Chip dark>{GRADE_LABEL[v.grade]}</Chip>
                <Chip>{WORK_FORMAT_LABEL[v.workFormat]}</Chip>
                <Chip>{EMPLOYMENT_LABEL[v.employment]}</Chip>
                {!imported ? <Chip>{EXPERIENCE_SHORT[v.experience]}</Chip> : null}
                {v.language !== "ru" ? <Chip>{LANGUAGE_LABEL[v.language] ?? v.language}</Chip> : null}
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {imported ? (
                  <ExternalApply href={applyHref} slug={v.slug} source={v.source} />
                ) : (
                  <a
                    href="#respond"
                    className="inline-flex min-h-12 items-center rounded-[10px] bg-accent px-6 text-[15px] font-extrabold text-ink hover:brightness-95"
                  >
                    Откликнуться
                  </a>
                )}
                <button
                  type="button"
                  className="inline-flex min-h-12 items-center gap-2 rounded-[10px] border border-line-2 bg-card px-[18px] text-[15px] font-bold text-ink hover:border-ink"
                >
                  <BookmarkIcon />
                  Сохранить
                </button>
                <button
                  type="button"
                  aria-label="Поделиться вакансией"
                  className="inline-flex h-12 w-12 items-center justify-center rounded-[10px] border border-line-2 bg-card hover:border-ink"
                >
                  <ShareIcon />
                </button>
                {v.publishedAt ? (
                  <span className="ml-auto text-[13px] text-muted-2">
                    Опубликовано {formatDate(v.publishedAt)} · {formatRelative(v.publishedAt, now)}
                  </span>
                ) : null}
              </div>
            </section>

            <section className="flex flex-col gap-6 rounded-xl border border-line bg-card p-7 text-[15px] leading-relaxed">
              {imported && v.descriptionHtml ? (
                <div className="job-html" dangerouslySetInnerHTML={{ __html: v.descriptionHtml }} />
              ) : null}
              {!imported && v.aboutTeam ? (
                <Section title="О команде">
                  <Paragraphs text={v.aboutTeam} />
                </Section>
              ) : null}
              {v.responsibilities ? (
                <Section title="Чем предстоит заниматься">
                  <Lines text={v.responsibilities} />
                </Section>
              ) : null}
              {v.requirements ? (
                <Section title="Что важно">
                  <Lines text={v.requirements} />
                </Section>
              ) : null}
              {v.niceToHave ? (
                <Section title="Будет плюсом">
                  <Lines text={v.niceToHave} />
                </Section>
              ) : null}
              {v.conditions ? (
                <Section title="Условия">
                  <Lines text={v.conditions} />
                </Section>
              ) : null}
              {v.skills.length ? (
                <div className="flex flex-col gap-2.5">
                  <h2 className="m-0 text-lg font-extrabold">Стек</h2>
                  <div className="flex flex-wrap gap-2">
                    {v.skills.map((s) => (
                      <Link
                        key={s.skillId}
                        href={`/?skills=${s.skill.slug}`}
                        className="rounded-full border border-line px-3 py-1.5 font-mono text-[13px] text-ink-2 hover:border-ink"
                      >
                        {s.skill.name}
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}
            </section>

            {imported ? (
              <section id="respond" className="flex flex-col gap-4 rounded-xl bg-ink p-7 text-white">
                <div className="flex flex-wrap items-center gap-5">
                  <div className="flex flex-[1_1_320px] flex-col gap-1.5">
                    <h2 className="m-0 text-xl font-extrabold">Откликнуться на вакансию</h2>
                    <p className="m-0 text-sm leading-relaxed text-header-muted">
                      Отклик уходит напрямую работодателю на его странице: откроется в новой вкладке.
                    </p>
                  </div>
                  <ExternalApply href={applyHref} slug={v.slug} source={v.source} />
                </div>
                <SourceLine source={v.source} url={v.externalUrl} companyName={v.company.name} dark />
                <Link href={`/report?vacancy=${v.slug}`} className="self-start text-[13px] font-semibold text-header-muted hover:text-white">
                  Пожаловаться на вакансию
                </Link>
              </section>
            ) : (
            <section id="respond" className="flex flex-col gap-5 rounded-xl bg-ink p-7 text-white">
              <div className="flex flex-wrap items-center gap-5">
                <div className="flex flex-[1_1_320px] flex-col gap-1.5">
                  <h2 className="m-0 text-xl font-extrabold">Откликнуться на вакансию</h2>
                  <p className="m-0 text-sm leading-relaxed text-header-muted">
                    {v.acceptsGithubLink
                      ? "Ссылка на резюме или на GitHub. Ответ работодателя появится в «Моих откликах»."
                      : "Ссылка на резюме. Ответ работодателя появится в «Моих откликах»."}
                  </p>
                </div>
                {!user ? (
                  <div className="flex flex-wrap gap-2.5">
                    <Link
                      href={`/login?next=${encodeURIComponent(`/vacancies/${v.slug}#respond`)}`}
                      className="inline-flex min-h-12 items-center rounded-[10px] bg-accent px-6 text-[15px] font-extrabold text-ink hover:brightness-95"
                    >
                      Войти и откликнуться
                    </Link>
                    <Link
                      href={`/register?next=${encodeURIComponent(`/vacancies/${v.slug}#respond`)}`}
                      className="inline-flex min-h-12 items-center px-3 text-sm font-semibold text-header-muted hover:text-white"
                    >
                      Зарегистрироваться
                    </Link>
                  </div>
                ) : null}
              </div>

              {user?.role === "CANDIDATE" && myApplication ? (
                <div role="status" className="rounded-lg border border-[#2F6F55] bg-[#1C3A2E] px-4 py-3 text-sm font-semibold text-[#BFE9D3]">
                  Вы откликнулись {formatDate(myApplication.createdAt)}. Статус: {APPLICATION_STATUS_LABEL[myApplication.status]}.{" "}
                  <Link href="/me" className="text-white underline">
                    Мои отклики
                  </Link>
                </div>
              ) : user?.role === "CANDIDATE" ? (
                <ApplyForm slug={v.slug} acceptsGithubLink={v.acceptsGithubLink} />
              ) : user ? (
                <p className="m-0 text-sm text-header-muted">Откликаться могут только аккаунты соискателей. Вы вошли как работодатель.</p>
              ) : null}

              <Link href={`/report?vacancy=${v.slug}`} className="self-start text-[13px] font-semibold text-header-muted hover:text-white">
                Пожаловаться на вакансию
              </Link>
            </section>
            )}
          </article>

          <aside className="box-border flex max-w-[340px] flex-[1_1_300px] flex-col gap-4">
            <section id="company" className="flex flex-col gap-3.5 rounded-xl border border-line bg-card p-[22px]">
              <div className="flex items-center gap-3.5">
                <CompanyAvatar name={v.company.name} logoUrl={v.company.logoUrl} initials={v.company.initials} size={52} />
                <div className="flex min-w-0 flex-col gap-0.5">
                  <Link href={`/companies/${v.company.slug}`} className="text-[17px] font-extrabold text-ink hover:underline">
                    {v.company.name}
                  </Link>
                  <span className="text-[13px] text-muted">
                    {[v.company.industry, v.company.city].filter(Boolean).join(" · ")}
                  </span>
                </div>
              </div>
              {v.company.description ? (
                <p className="m-0 text-sm leading-relaxed text-ink-2">{v.company.description}</p>
              ) : null}
              <div className="flex flex-wrap gap-4 text-sm">
                <Link href={`/?q=${encodeURIComponent(v.company.name)}`} className="font-bold text-link hover:text-ink">
                  {openCount} {plural(openCount, "открытая вакансия", "открытые вакансии", "открытых вакансий")}
                </Link>
                <Link href={`/companies/${v.company.slug}`} className="font-bold text-link hover:text-ink">
                  О компании
                </Link>
              </div>
              {v.company.isExternal && !v.company.claimedAt ? (
                <Link href={`/companies/${v.company.slug}/claim`} className="text-[13px] font-semibold text-muted hover:text-ink">
                  Это ваша компания? Заберите страницу
                </Link>
              ) : null}
            </section>

            {!imported ? (
            <section className="flex flex-col gap-3 rounded-xl border border-line bg-card p-[22px]">
              <h2 className="m-0 text-[15px] font-extrabold">Как проходит отбор</h2>
              <ol className="m-0 flex list-decimal flex-col gap-1 pl-5 text-sm leading-relaxed text-ink-2">
                <li>Ответ на отклик в течение 3 рабочих дней</li>
                <li>Созвон с инженером команды, 45 минут</li>
                <li>Техническое интервью</li>
                <li>Встреча с руководителем, оффер</li>
              </ol>
            </section>
            ) : null}

            {similar.length ? (
              <section className="flex flex-col gap-2.5">
                <h2 className="m-0 mb-1 text-[15px] font-extrabold">Похожие вакансии</h2>
                {similar.map((s) => (
                  <Link
                    key={s.id}
                    href={`/vacancies/${s.slug}?from=similar`}
                    className="flex flex-col gap-1 rounded-xl border border-line bg-card p-4 text-ink hover:border-ink"
                  >
                    <span className="text-[15px] font-extrabold leading-snug">{s.title}</span>
                    <span className="font-mono text-sm font-semibold">
                      {formatSalary(s.salaryFrom, s.salaryTo, s.currency)}
                    </span>
                    <span className="text-[13px] text-muted">
                      {s.company.name} · {formatLocation(s.city, s.workFormat, s.locationNote)}
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
