import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/guards";
import type { Prisma } from "@/generated/prisma/client";
import { PageHeader, Card, Table, Badge, Empty, Pagination, btn, nf, dateShort, dateTime } from "@/components/admin/ui";
import { CompanyAvatar } from "@/components/company-avatar";
import { decideClaimAction } from "./actions";

export const metadata: Metadata = { title: "Компании" };
const PAGE = 30;

export default async function CompaniesPage(props: PageProps<"/admin/companies">) {
  await requireRole("ADMIN", "/admin/companies");
  const sp = await props.searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const page = Math.max(1, Number(typeof sp.page === "string" ? sp.page : 1) || 1);
  const where: Prisma.CompanyWhereInput = q ? { name: { contains: q, mode: "insensitive" } } : {};

  const [claims, items, total] = await Promise.all([
    db.companyClaim.findMany({ where: { status: "PENDING" }, orderBy: { createdAt: "asc" }, include: { company: { select: { name: true, slug: true } }, user: { select: { email: true, name: true } } } }),
    db.company.findMany({
      where,
      orderBy: [{ vacancies: { _count: "desc" } }, { name: "asc" }],
      skip: (page - 1) * PAGE,
      take: PAGE,
      select: {
        id: true,
        slug: true,
        name: true,
        logoUrl: true,
        initials: true,
        city: true,
        isExternal: true,
        claimedAt: true,
        createdAt: true,
        _count: { select: { vacancies: { where: { status: "PUBLISHED" } }, members: true } },
      },
    }),
    db.company.count({ where }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE));

  return (
    <>
      <PageHeader title="Компании" subtitle={`Всего ${nf.format(total)}. Компании из импорта помечены как внешние, пока работодатель не заберёт страницу.`} />

      {claims.length ? (
        <Card className="mb-6" title={`Заявки «Это наша компания» (${claims.length})`} padded={false}>
          <Table>
            <thead>
              <tr>
                <th>Компания</th>
                <th>Кто просит</th>
                <th>Сообщение</th>
                <th>Когда</th>
                <th>Решение</th>
              </tr>
            </thead>
            <tbody>
              {claims.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link href={`/companies/${c.company.slug}`} className="a-link font-medium">
                      {c.company.name}
                    </Link>
                  </td>
                  <td>
                    {c.user.name ?? ""} <span className="text-xs text-[var(--a-muted)]">{c.user.email}</span>
                  </td>
                  <td className="max-w-[320px] text-xs">{c.message ?? "–"}</td>
                  <td className="whitespace-nowrap">{dateTime(c.createdAt)}</td>
                  <td>
                    <form action={decideClaimAction} className="flex gap-1">
                      <input type="hidden" name="id" value={c.id} />
                      <button type="submit" name="decision" value="approve" className={btn("primary", "sm")}>
                        Одобрить
                      </button>
                      <button type="submit" name="decision" value="reject" className={btn("danger", "sm")}>
                        Отклонить
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      ) : null}

      <Card className="mb-4">
        <form method="get" className="flex flex-wrap items-end gap-3">
          <label className="flex min-w-[220px] flex-1 flex-col gap-1 text-xs font-semibold uppercase tracking-wide">
            Поиск
            <input name="q" defaultValue={q} placeholder="Название компании" className="a-input" />
          </label>
          <button type="submit" className={btn("primary")}>
            Показать
          </button>
          {q ? (
            <Link href="/admin/companies" className={btn("ghost")}>
              Сбросить
            </Link>
          ) : null}
        </form>
      </Card>

      <Card padded={false}>
        {items.length === 0 ? (
          <Empty>Компаний не нашлось.</Empty>
        ) : (
          <Table>
            <thead>
              <tr>
                <th>Компания</th>
                <th>Город</th>
                <th className="text-right">Вакансий</th>
                <th className="text-right">Сотрудников в кабинете</th>
                <th>Тип</th>
                <th>Создана</th>
              </tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <CompanyAvatar name={c.name} logoUrl={c.logoUrl} initials={c.initials} size={36} />
                      <Link href={`/companies/${c.slug}`} className="a-link font-medium">
                        {c.name}
                      </Link>
                    </div>
                  </td>
                  <td>{c.city ?? "–"}</td>
                  <td className="text-right">
                    <Link href={`/admin/vacancies?q=${encodeURIComponent(c.name)}`} className="hover:underline">
                      {nf.format(c._count.vacancies)}
                    </Link>
                  </td>
                  <td className="text-right">{c._count.members}</td>
                  <td>{c.claimedAt ? <Badge tone="success">Подтверждена</Badge> : c.isExternal ? <Badge>Из импорта</Badge> : <Badge tone="primary">Работодатель</Badge>}</td>
                  <td className="whitespace-nowrap">{dateShort(c.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
        <Pagination page={page} pages={pages} href={(p) => `/admin/companies?${new URLSearchParams({ ...(q ? { q } : {}), ...(p > 1 ? { page: String(p) } : {}) }).toString()}`} />
      </Card>
    </>
  );
}
