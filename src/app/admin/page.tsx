import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/guards";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { StatusBadge } from "@/components/employer-shell";
import { GRADE_LABEL, WORK_FORMAT_LABEL, EMPLOYMENT_LABEL, formatSalary, formatDate, plural } from "@/lib/labels";
import { moderateAction } from "./actions";

export const metadata: Metadata = { title: "Модерация" };

function Lines({ text }: { text: string | null }) {
  if (!text) return <span className="text-[color:var(--soft-muted)]">пусто</span>;
  return (
    <ul className="m-0 flex list-disc flex-col gap-0.5 pl-5">
      {text
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((l, i) => (
          <li key={i}>{l}</li>
        ))}
    </ul>
  );
}

export default async function AdminPage() {
  const user = await requireRole("ADMIN", "/admin");
  if (user.role !== "ADMIN") return null;

  const [queue, counts] = await Promise.all([
    db.vacancy.findMany({
      where: { status: "MODERATION" },
      orderBy: { updatedAt: "asc" },
      include: { company: { select: { name: true, slug: true } }, author: { select: { email: true } }, skills: { orderBy: { order: "asc" }, include: { skill: true } } },
    }),
    db.vacancy.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);
  const count = Object.fromEntries(counts.map((c) => [c.status, c._count._all])) as Record<string, number>;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto box-border flex w-full max-w-[1180px] flex-1 flex-col gap-6 px-6 pb-12 pt-8">
        <div className="flex flex-col gap-1.5">
          <h1 className="m-0 text-[30px] font-extrabold leading-tight tracking-tight">Модерация</h1>
          <p className="m-0 text-[15px] text-[color:var(--soft-muted)]">
            В очереди {queue.length} {plural(queue.length, "вакансия", "вакансии", "вакансий")} · опубликовано {count.PUBLISHED ?? 0} · черновиков{" "}
            {count.DRAFT ?? 0} · отклонено {count.REJECTED ?? 0}
          </p>
        </div>

        {queue.length === 0 ? (
          <div className="neu-card-sm p-8">
            <p className="m-0 text-lg font-extrabold">Очередь пуста</p>
            <p className="m-0 mt-1 text-sm text-[color:var(--soft-muted)]">Новые вакансии на модерацию появятся здесь.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {queue.map((v) => (
              <article key={v.id} className="flex flex-col gap-4 neu-card-sm p-6">
                <div className="flex flex-wrap items-start gap-3">
                  <div className="flex min-w-0 flex-[1_1_360px] flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h2 className="m-0 text-xl font-extrabold leading-snug">{v.title}</h2>
                      <StatusBadge status={v.status} />
                    </div>
                    <span className="text-sm text-[color:var(--soft-muted)]">
                      {v.company.name} · {v.author?.email ?? "автор неизвестен"} · отправлена {formatDate(v.updatedAt)}
                    </span>
                  </div>
                  <span className="font-mono text-lg font-semibold">{formatSalary(v.salaryFrom, v.salaryTo, v.currency)}</span>
                </div>

                <div className="flex flex-wrap gap-2 text-xs font-bold">
                  <span className="chip-blue">{GRADE_LABEL[v.grade]}</span>
                  <span className="chip-flat">{WORK_FORMAT_LABEL[v.workFormat]}</span>
                  <span className="chip-flat">{EMPLOYMENT_LABEL[v.employment]}</span>
                  {v.city ? <span className="chip-flat">{v.city}</span> : null}
                  {v.skills.map((s) => (
                    <span key={s.skillId} className="neu-chip">
                      {s.skill.name}
                    </span>
                  ))}
                </div>

                <div className="grid gap-4 text-sm leading-relaxed sm:grid-cols-2">
                  <div className="flex flex-col gap-1">
                    <strong>О команде</strong>
                    <p className="m-0 whitespace-pre-line">{v.aboutTeam ?? <span className="text-[color:var(--soft-muted)]">пусто</span>}</p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <strong>Чем предстоит заниматься</strong>
                    <Lines text={v.responsibilities} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <strong>Что важно</strong>
                    <Lines text={v.requirements} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <strong>Условия</strong>
                    <Lines text={v.conditions} />
                  </div>
                </div>

                <form action={moderateAction} className="flex flex-wrap items-center gap-3 border-t border-[color:var(--soft-dark)] pt-5">
                  <input type="hidden" name="id" value={v.id} />
                  <button
                    type="submit"
                    name="decision"
                    value="approve"
                    className="neu-primary-sm"
                  >
                    Опубликовать
                  </button>
                  <button
                    type="submit"
                    name="decision"
                    value="reject"
                    className="neu-btn-sm"
                  >
                    Отклонить
                  </button>
                  <Link href={`/employer/vacancies/${v.id}/edit`} className="ml-auto text-sm soft-link">
                    Открыть в редакторе
                  </Link>
                </form>
              </article>
            ))}
          </div>
        )}
      </main>
      <SiteFooter compact />
    </>
  );
}
