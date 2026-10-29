import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/guards";
import { GRADE_LABEL, WORK_FORMAT_LABEL, EMPLOYMENT_LABEL, formatSalary, formatDate, plural } from "@/lib/labels";
import { ADAPTER_BY_SOURCE } from "@/lib/import/sources";
import { PageHeader, Card, Badge, Empty, StatusBadgeAdmin, btn, dateTime } from "@/components/admin/ui";
import { moderateAction, resolveReportAction } from "./actions";

export const metadata: Metadata = { title: "Модерация" };

function Lines({ text }: { text: string | null }) {
  if (!text) return <span className="text-[var(--a-muted)]">пусто</span>;
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

export default async function ModerationPage() {
  await requireRole("ADMIN", "/admin/moderation");

  const [queue, counts, reports] = await Promise.all([
    db.vacancy.findMany({
      where: { status: "MODERATION" },
      orderBy: { updatedAt: "asc" },
      take: 50,
      include: { company: { select: { name: true, slug: true } }, author: { select: { email: true } }, skills: { orderBy: { order: "asc" }, include: { skill: true } } },
    }),
    db.vacancy.groupBy({ by: ["status"], _count: { _all: true } }),
    db.report.findMany({
      where: { status: "OPEN" },
      orderBy: { createdAt: "asc" },
      include: { vacancy: { select: { id: true, slug: true, title: true, status: true, company: { select: { name: true } } } } },
      take: 50,
    }),
  ]);
  const count = Object.fromEntries(counts.map((c) => [c.status, c._count._all])) as Record<string, number>;

  return (
    <>
      <PageHeader
        title="Модерация"
        subtitle={`В очереди ${queue.length} ${plural(queue.length, "вакансия", "вакансии", "вакансий")} · опубликовано ${count.PUBLISHED ?? 0} · черновиков ${count.DRAFT ?? 0} · скрыто ${count.REJECTED ?? 0}`}
      />

      {queue.length === 0 ? (
        <Card>
          <Empty>Очередь пуста. Вакансии работодателей и импорт в режиме «через модерацию» появятся здесь.</Empty>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {queue.map((v) => {
            const imported = v.source !== "MANUAL";
            return (
              <Card key={v.id}>
                <div className="flex flex-wrap items-start gap-3">
                  <div className="flex min-w-0 flex-[1_1_360px] flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h2 className="m-0 text-lg font-semibold">{v.title}</h2>
                      {imported ? <Badge tone="info">{ADAPTER_BY_SOURCE[v.source as keyof typeof ADAPTER_BY_SOURCE]?.label ?? v.source}</Badge> : <Badge tone="primary">Работодатель</Badge>}
                    </div>
                    <span className="text-sm">
                      {v.company.name} · {v.author?.email ?? (imported ? "импорт" : "автор неизвестен")} · {formatDate(v.updatedAt)}
                    </span>
                  </div>
                  <span className="font-mono text-lg font-semibold text-[var(--a-heading)]">{formatSalary(v.salaryFrom, v.salaryTo, v.currency)}</span>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge tone="primary">{GRADE_LABEL[v.grade]}</Badge>
                  <Badge>{WORK_FORMAT_LABEL[v.workFormat]}</Badge>
                  <Badge>{EMPLOYMENT_LABEL[v.employment]}</Badge>
                  {v.city ? <Badge>{v.city}</Badge> : null}
                  {v.locationNote ? <Badge>{v.locationNote}</Badge> : null}
                  {v.skills.map((s) => (
                    <span key={s.skillId} className="rounded-full border border-[var(--a-line)] px-2.5 py-0.5 font-mono text-xs">
                      {s.skill.name}
                    </span>
                  ))}
                </div>

                {imported ? (
                  <div className="job-html mt-4 max-h-72 overflow-y-auto rounded-md border border-[var(--a-line-soft)] p-4 text-sm" dangerouslySetInnerHTML={{ __html: v.descriptionHtml ?? "" }} />
                ) : (
                  <div className="mt-4 grid gap-4 text-sm leading-relaxed sm:grid-cols-2">
                    <div className="flex flex-col gap-1">
                      <strong className="text-[var(--a-heading)]">О команде</strong>
                      <p className="m-0 whitespace-pre-line">{v.aboutTeam ?? <span className="text-[var(--a-muted)]">пусто</span>}</p>
                    </div>
                    <div className="flex flex-col gap-1">
                      <strong className="text-[var(--a-heading)]">Чем предстоит заниматься</strong>
                      <Lines text={v.responsibilities} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <strong className="text-[var(--a-heading)]">Что важно</strong>
                      <Lines text={v.requirements} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <strong className="text-[var(--a-heading)]">Условия</strong>
                      <Lines text={v.conditions} />
                    </div>
                  </div>
                )}

                <form action={moderateAction} className="mt-4 flex flex-wrap items-center gap-2 border-t border-[var(--a-line-soft)] pt-4">
                  <input type="hidden" name="id" value={v.id} />
                  {!imported ? (
                    <input type="text" name="comment" placeholder="Причина отклонения (работодатель увидит её в письме и в редакторе)" className="a-input order-first w-full" />
                  ) : null}
                  <button type="submit" name="decision" value="approve" className={btn("primary")}>
                    Опубликовать
                  </button>
                  <button type="submit" name="decision" value="reject" className={btn("danger")}>
                    {imported ? "Скрыть" : "Отклонить"}
                  </button>
                  {imported ? (
                    <a href={v.externalUrl ?? "#"} target="_blank" rel="noopener noreferrer" className="a-link ml-auto text-sm">
                      Открыть в источнике
                    </a>
                  ) : (
                    <Link href={`/employer/vacancies/${v.id}/edit`} className="a-link ml-auto text-sm">
                      Открыть в редакторе
                    </Link>
                  )}
                </form>
              </Card>
            );
          })}
        </div>
      )}

      <Card className="mt-6" title={`Жалобы${reports.length ? ` (${reports.length})` : ""}`} padded={false}>
        {reports.length === 0 ? (
          <Empty>Открытых жалоб нет. Посетители оставляют их по ссылке «Пожаловаться на вакансию».</Empty>
        ) : (
          <ul className="m-0 list-none divide-y divide-[var(--a-line-soft)] p-0">
            {reports.map((r) => (
              <li key={r.id} className="flex flex-wrap items-start gap-4 px-6 py-4">
                <div className="flex min-w-0 flex-[1_1_360px] flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/vacancies/${r.vacancy.slug}`} className="a-link font-semibold">
                      {r.vacancy.title}
                    </Link>
                    <StatusBadgeAdmin status={r.vacancy.status} />
                  </div>
                  <span className="text-xs text-[var(--a-muted)]">
                    {r.vacancy.company.name} · {dateTime(r.createdAt)} · {r.email ?? "аноним"}
                  </span>
                  <p className="m-0 mt-1 text-sm font-semibold text-[var(--a-heading)]">{r.reason}</p>
                  {r.comment ? <p className="m-0 whitespace-pre-line text-sm">{r.comment}</p> : null}
                </div>
                <form action={resolveReportAction} className="flex flex-wrap items-center gap-2">
                  <input type="hidden" name="id" value={r.id} />
                  <input type="hidden" name="vacancyId" value={r.vacancy.id} />
                  <button type="submit" name="decision" value="archive" className={btn("danger", "sm")}>
                    Снять вакансию
                  </button>
                  <button type="submit" name="decision" value="dismiss" className={btn("ghost", "sm")}>
                    Отклонить жалобу
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
