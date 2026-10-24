import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireEmployer } from "@/lib/guards";
import { EmployerHeader, StatusBadge } from "@/components/employer-shell";
import { SiteFooter } from "@/components/site-footer";
import { SuccessBanner } from "@/components/form";
import { formatSalary, formatDate, plural } from "@/lib/labels";
import { GRADE_LABEL, WORK_FORMAT_SHORT } from "@/lib/labels";
import { archiveVacancyAction } from "./actions";

export const metadata: Metadata = { title: "Мои вакансии" };

export default async function EmployerHome(props: PageProps<"/employer">) {
  const user = await requireEmployer("/employer");
  const sp = await props.searchParams;

  const vacancies = await db.vacancy.findMany({
    where: { companyId: user.companyId },
    orderBy: [{ updatedAt: "desc" }],
    include: { _count: { select: { applications: true } }, skills: { orderBy: { order: "asc" }, include: { skill: true }, take: 4 } },
  });

  const published = vacancies.filter((v) => v.status === "PUBLISHED").length;
  const newResponses = await db.application.count({ where: { vacancy: { companyId: user.companyId }, status: "NEW" } });

  return (
    <>
      <EmployerHeader user={user} active="vacancies" />
      <main className="mx-auto box-border flex w-full max-w-[1180px] flex-1 flex-col gap-6 px-6 pb-12 pt-8">
        <SuccessBanner message={sp.sent ? "Вакансия отправлена на модерацию. Обычно это занимает до одного рабочего дня." : undefined} />

        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <h1 className="m-0 text-[30px] font-extrabold leading-tight tracking-tight">Мои вакансии</h1>
            <p className="m-0 text-sm text-muted">
              {published} {plural(published, "опубликованная", "опубликованные", "опубликованных")} ·{" "}
              {newResponses} {plural(newResponses, "новый отклик", "новых отклика", "новых откликов")}
            </p>
          </div>
          <Link
            href="/employer/vacancies/new"
            className="inline-flex min-h-12 items-center rounded-[10px] bg-accent px-6 text-[15px] font-extrabold text-ink hover:brightness-95"
          >
            Новая вакансия
          </Link>
        </div>

        {vacancies.length === 0 ? (
          <div className="flex flex-col items-start gap-3 rounded-xl border border-line bg-card p-8">
            <p className="m-0 text-lg font-extrabold">Пока ни одной вакансии</p>
            <p className="m-0 max-w-[520px] text-sm leading-relaxed text-muted">
              Создайте первую: укажите вилку, стек и задачи. После модерации она появится в поиске, а отклики придут сюда.
            </p>
            <Link href="/employer/vacancies/new" className="mt-1 inline-flex min-h-11 items-center rounded-lg bg-ink px-4 text-sm font-bold text-white">
              Создать вакансию
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {vacancies.map((v) => (
              <article key={v.id} className="flex flex-wrap items-center gap-4 rounded-xl border border-line bg-card px-[22px] py-4">
                <div className="flex min-w-0 flex-[1_1_360px] flex-col gap-1.5">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <Link href={`/employer/vacancies/${v.id}/edit`} className="text-[17px] font-extrabold leading-snug text-ink hover:underline">
                      {v.title}
                    </Link>
                    <StatusBadge status={v.status} />
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-[13px] text-muted">
                    <span className="font-mono font-semibold text-ink">{formatSalary(v.salaryFrom, v.salaryTo, v.currency)}</span>
                    <span aria-hidden="true">·</span>
                    <span>{GRADE_LABEL[v.grade]}</span>
                    <span aria-hidden="true">·</span>
                    <span>{WORK_FORMAT_SHORT[v.workFormat]}</span>
                    {v.skills.length ? (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono">{v.skills.map((s) => s.skill.name).join(", ")}</span>
                      </>
                    ) : null}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-0.5 text-[13px] text-muted">
                  <Link href={`/employer/vacancies/${v.id}/applications`} className="font-bold text-link hover:text-ink">
                    {v._count.applications} {plural(v._count.applications, "отклик", "отклика", "откликов")}
                  </Link>
                  <span>{v.publishedAt ? `с ${formatDate(v.publishedAt)}` : `изменена ${formatDate(v.updatedAt)}`}</span>
                </div>
                <div className="flex items-center gap-2">
                  {v.status === "PUBLISHED" ? (
                    <Link
                      href={`/vacancies/${v.slug}`}
                      className="inline-flex min-h-11 items-center rounded-lg border border-line-2 px-3.5 text-sm font-bold text-ink hover:border-ink"
                    >
                      Открыть
                    </Link>
                  ) : null}
                  <Link
                    href={`/employer/vacancies/${v.id}/edit`}
                    className="inline-flex min-h-11 items-center rounded-lg border border-line-2 px-3.5 text-sm font-bold text-ink hover:border-ink"
                  >
                    Редактировать
                  </Link>
                  {v.status !== "ARCHIVED" ? (
                    <form action={archiveVacancyAction}>
                      <input type="hidden" name="id" value={v.id} />
                      <button type="submit" className="inline-flex min-h-11 items-center px-3 text-sm font-semibold text-muted hover:text-ink">
                        В архив
                      </button>
                    </form>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
      <SiteFooter compact />
    </>
  );
}
