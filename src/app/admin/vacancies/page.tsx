import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/guards";
import type { Prisma, VacancySource, VacancyStatus } from "@/generated/prisma/client";
import { ADAPTERS, ADAPTER_BY_SOURCE } from "@/lib/import/sources";
import { formatSalary } from "@/lib/labels";
import { PageHeader, Card, Table, StatusBadgeAdmin, Badge, Empty, Pagination, btn, nf, dateShort } from "@/components/admin/ui";
import { setVacancyStatusAction, deleteVacancyAction } from "./actions";

export const metadata: Metadata = { title: "Вакансии" };

const PAGE = 30;
const STATUSES: VacancyStatus[] = ["PUBLISHED", "MODERATION", "DRAFT", "ARCHIVED", "REJECTED"];
const STATUS_LABEL: Record<VacancyStatus, string> = {
  PUBLISHED: "Опубликованные",
  MODERATION: "На модерации",
  DRAFT: "Черновики",
  ARCHIVED: "В архиве",
  REJECTED: "Скрытые",
};

export default async function AdminVacancies(props: PageProps<"/admin/vacancies">) {
  await requireRole("ADMIN", "/admin/vacancies");
  const sp = await props.searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const status = typeof sp.status === "string" && (STATUSES as string[]).includes(sp.status) ? (sp.status as VacancyStatus) : undefined;
  const source = typeof sp.source === "string" && (sp.source === "MANUAL" || sp.source in ADAPTER_BY_SOURCE) ? (sp.source as VacancySource) : undefined;
  const page = Math.max(1, Number(typeof sp.page === "string" ? sp.page : 1) || 1);

  const where: Prisma.VacancyWhereInput = {
    ...(status ? { status } : {}),
    ...(source ? { source } : {}),
    ...(q ? { OR: [{ title: { contains: q, mode: "insensitive" } }, { company: { name: { contains: q, mode: "insensitive" } } }] } : {}),
  };

  const [items, total, viewsRows] = await Promise.all([
    db.vacancy.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }],
      skip: (page - 1) * PAGE,
      take: PAGE,
      select: {
        id: true,
        slug: true,
        title: true,
        status: true,
        source: true,
        grade: true,
        salaryFrom: true,
        salaryTo: true,
        currency: true,
        salaryPeriod: true,
        publishedAt: true,
        updatedAt: true,
        externalUrl: true,
        company: { select: { name: true, slug: true } },
        _count: { select: { applications: true } },
      },
    }),
    db.vacancy.count({ where }),
    db.pageView.groupBy({ by: ["vacancyId"], where: { vacancyId: { not: null } }, _count: { _all: true } }),
  ]);
  const views = new Map(viewsRows.map((r) => [r.vacancyId, r._count._all]));
  const pages = Math.max(1, Math.ceil(total / PAGE));

  const query = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { q: q || undefined, status, source, page: String(page), ...patch };
    for (const [k, v] of Object.entries(merged)) if (v && !(k === "page" && v === "1")) p.set(k, v);
    const s = p.toString();
    return s ? `/admin/vacancies?${s}` : "/admin/vacancies";
  };
  const back = query({});

  return (
    <>
      <PageHeader title="Вакансии" subtitle={`Найдено ${nf.format(total)}`} />

      <Card className="mb-4">
        <form method="get" className="flex flex-wrap items-end gap-3">
          <label className="flex min-w-[220px] flex-[2_1_220px] flex-col gap-1 text-xs font-semibold uppercase tracking-wide">
            Поиск
            <input name="q" defaultValue={q} placeholder="Название или компания" className="a-input" />
          </label>
          <label className="flex min-w-[190px] flex-1 flex-col gap-1 text-xs font-semibold uppercase tracking-wide">
            Статус
            <select name="status" defaultValue={status ?? ""} className="a-select">
              <option value="">Все</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-[160px] flex-1 flex-col gap-1 text-xs font-semibold uppercase tracking-wide">
            Источник
            <select name="source" defaultValue={source ?? ""} className="a-select">
              <option value="">Все</option>
              <option value="MANUAL">Работодатели</option>
              {ADAPTERS.map((a) => (
                <option key={a.source} value={a.source}>
                  {a.label}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className={btn("primary")}>
            Показать
          </button>
          {q || status || source ? (
            <Link href="/admin/vacancies" className={btn("ghost")}>
              Сбросить
            </Link>
          ) : null}
        </form>
      </Card>

      <Card padded={false}>
        {items.length === 0 ? (
          <Empty>Ничего не нашлось.</Empty>
        ) : (
          <Table>
            <thead>
              <tr>
                <th>Вакансия</th>
                <th>Компания</th>
                <th>Источник</th>
                <th>Статус</th>
                <th className="text-right">Просмотры</th>
                <th className="text-right">Отклики</th>
                <th>Опубликована</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {items.map((v) => (
                <tr key={v.id}>
                  <td className="max-w-[380px]">
                    <Link href={`/vacancies/${v.slug}`} className="a-link font-medium">
                      {v.title}
                    </Link>
                    <div className="text-xs text-[var(--a-muted)]">
                      {v.grade} · {formatSalary(v.salaryFrom, v.salaryTo, v.currency)}
                      {v.salaryPeriod === "YEAR" && (v.salaryFrom || v.salaryTo) ? " в год" : ""}
                    </div>
                  </td>
                  <td className="whitespace-nowrap">
                    <Link href={`/admin/companies?q=${encodeURIComponent(v.company.name)}`} className="hover:underline">
                      {v.company.name}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap">
                    {v.source === "MANUAL" ? (
                      <Badge tone="primary">Работодатель</Badge>
                    ) : (
                      <a href={v.externalUrl ?? "#"} target="_blank" rel="noopener noreferrer" title="Открыть в источнике">
                        <Badge tone="info">{ADAPTER_BY_SOURCE[v.source as keyof typeof ADAPTER_BY_SOURCE]?.label ?? v.source}</Badge>
                      </a>
                    )}
                  </td>
                  <td>
                    <StatusBadgeAdmin status={v.status} />
                  </td>
                  <td className="text-right">{nf.format(views.get(v.id) ?? 0)}</td>
                  <td className="text-right">{nf.format(v._count.applications)}</td>
                  <td className="whitespace-nowrap">{dateShort(v.publishedAt)}</td>
                  <td className="whitespace-nowrap">
                    <div className="flex gap-1">
                      {v.status !== "PUBLISHED" ? (
                        <form action={setVacancyStatusAction}>
                          <input type="hidden" name="id" value={v.id} />
                          <input type="hidden" name="status" value="PUBLISHED" />
                          <input type="hidden" name="back" value={back} />
                          <button type="submit" className={btn("outline", "sm")}>
                            Опубликовать
                          </button>
                        </form>
                      ) : (
                        <form action={setVacancyStatusAction}>
                          <input type="hidden" name="id" value={v.id} />
                          <input type="hidden" name="status" value="ARCHIVED" />
                          <input type="hidden" name="back" value={back} />
                          <button type="submit" className={btn("ghost", "sm")}>
                            В архив
                          </button>
                        </form>
                      )}
                      {v.status !== "REJECTED" ? (
                        <form action={setVacancyStatusAction}>
                          <input type="hidden" name="id" value={v.id} />
                          <input type="hidden" name="status" value="REJECTED" />
                          <input type="hidden" name="back" value={back} />
                          <button type="submit" className={btn("danger", "sm")} title={v.source === "MANUAL" ? "Отклонить" : "Скрыть и больше не импортировать"}>
                            {v.source === "MANUAL" ? "Отклонить" : "Скрыть"}
                          </button>
                        </form>
                      ) : null}
                      {v.source !== "MANUAL" ? (
                        <form action={deleteVacancyAction}>
                          <input type="hidden" name="id" value={v.id} />
                          <input type="hidden" name="back" value={back} />
                          <button type="submit" className={btn("ghost", "sm")} title="Удалить из базы">
                            Удалить
                          </button>
                        </form>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
        <Pagination page={page} pages={pages} href={(p) => query({ page: String(p) })} />
      </Card>
    </>
  );
}
