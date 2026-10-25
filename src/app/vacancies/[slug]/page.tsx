import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Chip, SkillTag } from "@/components/vacancy-card";
import { BookmarkIcon, ShareIcon } from "@/components/icons";
import { getVacancyBySlug, similarVacancies, countCompanyVacancies } from "@/lib/vacancies";
import { getCurrentUser } from "@/lib/session";
import { db } from "@/lib/db";
import { ApplyForm } from "./apply-form";
import {
  APPLICATION_STATUS_LABEL,
  GRADE_LABEL,
  WORK_FORMAT_LABEL,
  EMPLOYMENT_LABEL,
  EXPERIENCE_SHORT,
  SALARY_TYPE_LABEL,
  formatSalary,
  formatRelative,
  formatDate,
  formatLocation,
  plural,
} from "@/lib/labels";

const loadVacancy = cache(getVacancyBySlug);

const muted = "text-[color:var(--soft-muted)]";
const text = "text-[color:var(--soft-text)]";

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
  const respondHref = `/vacancies/${v.slug}#respond`;

  return (
    <>
      <SiteHeader />

      <main className="mx-auto box-border flex w-full max-w-[1180px] flex-col gap-6 px-6 pb-14 pt-4">
        <nav aria-label="Хлебные крошки" className={`flex flex-wrap items-center gap-2 text-[13px] ${muted}`}>
          <Link href="/" className="hover:text-[color:var(--soft-text)]">
            Вакансии
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
                  {salary} {hasSalary ? <span className={`font-sans text-sm font-semibold ${muted}`}>{SALARY_TYPE_LABEL[v.salaryType]}</span> : null}
                </div>
                <div className={`flex flex-wrap items-center gap-2 text-[15px] ${muted}`}>
                  <a href="#company" className="soft-link">
                    {v.company.name}
                  </a>
                  <span aria-hidden="true">·</span>
                  <span>{formatLocation(v.city, v.workFormat)}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Chip dark>{GRADE_LABEL[v.grade]}</Chip>
                <Chip>{WORK_FORMAT_LABEL[v.workFormat]}</Chip>
                <Chip>{EMPLOYMENT_LABEL[v.employment]}</Chip>
                <Chip>{EXPERIENCE_SHORT[v.experience]}</Chip>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <a href="#respond" className="neu-primary-sm" style={{ minHeight: 48, padding: "0 24px", fontSize: 15 }}>
                  Откликнуться
                </a>
                <button type="button" className="neu-btn-sm" style={{ minHeight: 48 }}>
                  <BookmarkIcon />
                  Сохранить
                </button>
                <button type="button" aria-label="Поделиться вакансией" className="neu-btn-sm h-12 w-12 px-0">
                  <ShareIcon />
                </button>
                {v.publishedAt ? (
                  <span className={`ml-auto text-[13px] ${muted}`}>
                    Опубликовано {formatDate(v.publishedAt)} · {formatRelative(v.publishedAt, now)}
                  </span>
                ) : null}
              </div>
            </section>

            <section className={`neu-card flex flex-col gap-6 p-8 text-[15px] leading-relaxed ${text}`}>
              {v.aboutTeam ? (
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
                <div className="flex flex-col gap-3">
                  <h2 className="m-0 text-lg font-extrabold">Стек</h2>
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

            <section id="respond" className="neu-card flex flex-col gap-5 p-8">
              <div className="flex flex-wrap items-center gap-5">
                <div className="flex flex-[1_1_320px] flex-col gap-1.5">
                  <h2 className="m-0 text-xl font-extrabold">Откликнуться на вакансию</h2>
                  <p className={`m-0 text-sm leading-relaxed ${muted}`}>
                    {v.acceptsGithubLink
                      ? "Ссылка на резюме или на GitHub. Ответ работодателя появится в «Моих откликах»."
                      : "Ссылка на резюме. Ответ работодателя появится в «Моих откликах»."}
                  </p>
                </div>
                {!user ? (
                  <div className="flex flex-wrap items-center gap-3">
                    <Link href={`/login?next=${encodeURIComponent(respondHref)}`} className="neu-primary-sm" style={{ minHeight: 48, padding: "0 24px", fontSize: 15 }}>
                      Войти и откликнуться
                    </Link>
                    <Link href={`/register?next=${encodeURIComponent(respondHref)}`} className="soft-link text-sm">
                      Зарегистрироваться
                    </Link>
                  </div>
                ) : null}
              </div>

              {user?.role === "CANDIDATE" && myApplication ? (
                <div role="status" className="neu-inset rounded-xl px-4 py-3 text-sm font-semibold text-[#1F6F58]">
                  Вы откликнулись {formatDate(myApplication.createdAt)}. Статус: {APPLICATION_STATUS_LABEL[myApplication.status]}.{" "}
                  <Link href="/me" className="soft-link">
                    Мои отклики
                  </Link>
                </div>
              ) : user?.role === "CANDIDATE" ? (
                <ApplyForm slug={v.slug} acceptsGithubLink={v.acceptsGithubLink} />
              ) : user ? (
                <p className={`m-0 text-sm ${muted}`}>Откликаться могут только аккаунты соискателей. Вы вошли как работодатель.</p>
              ) : null}

              <Link href={`/report?vacancy=${v.slug}`} className={`self-start text-[13px] font-semibold ${muted} hover:text-[color:var(--soft-text)]`}>
                Пожаловаться на вакансию
              </Link>
            </section>
          </article>

          <aside className="box-border flex max-w-[340px] flex-[1_1_300px] flex-col gap-5">
            <section id="company" className="neu-card flex flex-col gap-4 p-6">
              <div className="flex items-center gap-3.5">
                <div aria-hidden="true" className="chip-blue flex h-[52px] w-[52px] flex-none items-center justify-center rounded-[14px] text-lg font-extrabold">
                  {v.company.initials ?? v.company.name.slice(0, 2).toUpperCase()}
                </div>
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
                  {openCount} {plural(openCount, "открытая вакансия", "открытые вакансии", "открытых вакансий")}
                </Link>
                <Link href={`/companies/${v.company.slug}`} className="soft-link">
                  О компании
                </Link>
              </div>
            </section>

            <section className="neu-card flex flex-col gap-3 p-6">
              <h2 className="m-0 text-[15px] font-extrabold">Как проходит отбор</h2>
              <ol className={`m-0 flex list-decimal flex-col gap-1 pl-5 text-sm leading-relaxed ${text}`}>
                <li>Ответ на отклик в течение 3 рабочих дней</li>
                <li>Созвон с инженером команды, 45 минут</li>
                <li>Техническое интервью</li>
                <li>Встреча с руководителем, оффер</li>
              </ol>
            </section>

            {similar.length ? (
              <section className="flex flex-col gap-3">
                <h2 className="m-0 mb-1 text-[15px] font-extrabold">Похожие вакансии</h2>
                {similar.map((s) => (
                  <Link key={s.id} href={`/vacancies/${s.slug}`} className={`neu-card-sm flex flex-col gap-1 p-5 ${text}`}>
                    <span className="text-[15px] font-extrabold leading-snug">{s.title}</span>
                    <span className="font-mono text-sm font-semibold">{formatSalary(s.salaryFrom, s.salaryTo, s.currency)}</span>
                    <span className={`text-[13px] ${muted}`}>
                      {s.company.name} · {formatLocation(s.city, s.workFormat)}
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
