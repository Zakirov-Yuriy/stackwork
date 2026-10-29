import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireEmployer } from "@/lib/guards";
import { EmployerHeader, StatusBadge } from "@/components/employer-shell";
import { SiteFooter } from "@/components/site-footer";
import { APPLICATION_STATUS_LABEL, formatDate, plural } from "@/lib/labels";
import { setApplicationStatusAction } from "./actions";

export const metadata: Metadata = { title: "Отклики на вакансию" };

const NEXT_STATUSES = ["VIEWED", "INTERVIEW", "OFFER", "REJECTED"] as const;

export default async function ApplicationsPage(props: PageProps<"/employer/vacancies/[id]/applications">) {
  const user = await requireEmployer("/employer");
  const { id } = await props.params;

  const v = await db.vacancy.findFirst({
    where: { id, companyId: user.companyId },
    include: {
      applications: {
        orderBy: { createdAt: "desc" },
        include: { candidate: { select: { name: true, email: true } } },
      },
    },
  });
  if (!v) notFound();

  // Новые отклики помечаем просмотренными при открытии списка
  const newIds = v.applications.filter((a) => a.status === "NEW").map((a) => a.id);
  if (newIds.length) {
    await db.application.updateMany({ where: { id: { in: newIds } }, data: { status: "VIEWED" } });
  }

  return (
    <>
      <EmployerHeader user={user} active="responses" />
      <main className="mx-auto box-border flex w-full max-w-[1180px] flex-1 flex-col gap-6 px-6 pb-12 pt-8">
        <nav aria-label="Хлебные крошки" className="flex flex-wrap items-center gap-2 text-[13px] text-[color:var(--soft-muted)]">
          <Link href="/employer" className="hover:text-[color:var(--soft-text)]">
            Мои вакансии
          </Link>
          <span aria-hidden="true">/</span>
          <span className="text-[color:var(--soft-text)]">{v.title}</span>
        </nav>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="m-0 text-[30px] font-extrabold leading-tight tracking-tight">Отклики</h1>
          <StatusBadge status={v.status} />
          <span className="text-sm text-[color:var(--soft-muted)]">
            {v.applications.length} {plural(v.applications.length, "отклик", "отклика", "откликов")}
          </span>
        </div>

        {v.applications.length === 0 ? (
          <div className="neu-card-sm p-8">
            <p className="m-0 text-lg font-extrabold">Откликов пока нет</p>
            <p className="m-0 mt-1 text-sm text-[color:var(--soft-muted)]">
              {v.status === "PUBLISHED" ? "Вакансия в поиске, отклики появятся здесь." : "Вакансия не опубликована, соискатели её не видят."}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {v.applications.map((a) => {
              const status = newIds.includes(a.id) ? "VIEWED" : a.status;
              return (
                <article key={a.id} className="flex flex-col gap-3 neu-card-sm px-[22px] py-5">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-[17px] font-extrabold">{a.candidate.name ?? "Без имени"}</span>
                    <a href={`mailto:${a.candidate.email}`} className="text-sm soft-link">
                      {a.candidate.email}
                    </a>
                    <span className="chip-flat">{APPLICATION_STATUS_LABEL[status]}</span>
                    <span className="ml-auto text-[13px] text-[color:var(--soft-muted)]">{formatDate(a.createdAt)}</span>
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm">
                    {a.resumeUrl ? (
                      <a href={a.resumeUrl} target="_blank" rel="noopener noreferrer" className="soft-link">
                        Резюме
                      </a>
                    ) : null}
                    {a.githubUrl ? (
                      <a href={a.githubUrl} target="_blank" rel="noopener noreferrer" className="font-mono soft-link">
                        {a.githubUrl.replace(/^https?:\/\/(www\.)?/, "")}
                      </a>
                    ) : null}
                  </div>
                  {a.coverLetter ? <p className="m-0 whitespace-pre-line text-[15px] leading-relaxed text-[color:var(--soft-text)]">{a.coverLetter}</p> : null}
                  <form action={setApplicationStatusAction} className="flex flex-wrap items-center gap-2 pt-1">
                    <input type="hidden" name="id" value={a.id} />
                    <input type="hidden" name="vacancyId" value={v.id} />
                    {NEXT_STATUSES.filter((s) => s !== status).map((s) => (
                      <button
                        key={s}
                        type="submit"
                        name="status"
                        value={s}
                        className={`neu-btn-sm ${s === "REJECTED" ? "text-[color:var(--soft-muted)]" : ""}`}
                        style={{ minHeight: 40, fontSize: 13 }}
                      >
                        {s === "VIEWED" ? "Просмотрен" : s === "INTERVIEW" ? "Пригласить на интервью" : s === "OFFER" ? "Оффер" : "Отказать"}
                      </button>
                    ))}
                  </form>
                </article>
              );
            })}
          </div>
        )}
      </main>
      <SiteFooter compact />
    </>
  );
}
