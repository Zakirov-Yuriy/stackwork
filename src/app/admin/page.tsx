import type { Metadata } from "next";
import Link from "next/link";
import { Briefcase, Building2, Download, Eye, ShieldCheck, Users } from "lucide-react";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/guards";
import { dashboardCounts } from "@/lib/stats/queries";
import { ADAPTER_BY_SOURCE } from "@/lib/import/sources";
import { PageHeader, StatCard, Card, Table, StatusBadgeAdmin, Empty, LinkButton, nf, dateTime } from "@/components/admin/ui";
import { formatSalary } from "@/lib/labels";

export const metadata: Metadata = { title: "Главная" };

export default async function AdminHome() {
  await requireRole("ADMIN", "/admin");
  const [c, recent, claims] = await Promise.all([
    dashboardCounts(),
    db.vacancy.findMany({
      orderBy: { updatedAt: "desc" },
      take: 10,
      select: { id: true, slug: true, title: true, status: true, source: true, salaryFrom: true, salaryTo: true, currency: true, updatedAt: true, company: { select: { name: true } } },
    }),
    db.companyClaim.findMany({ where: { status: "PENDING" }, take: 5, orderBy: { createdAt: "asc" }, include: { company: { select: { name: true } }, user: { select: { email: true } } } }),
  ]);

  const lastRun = c.lastRun;
  const lastLabel = lastRun ? `${ADAPTER_BY_SOURCE[lastRun.source as keyof typeof ADAPTER_BY_SOURCE]?.label ?? lastRun.source}, ${dateTime(lastRun.startedAt)}` : "ещё не запускался";

  return (
    <>
      <PageHeader title="Главная" subtitle={`Сегодня: ${nf.format(c.todayVisitors)} посетителей, ${nf.format(c.todayViews)} просмотров`} />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <StatCard icon={<Briefcase size={20} />} label="Опубликовано" value={nf.format(c.published)} hint={`${nf.format(c.imported)} из импорта, ${nf.format(c.manual)} от работодателей`} href="/admin/vacancies?status=PUBLISHED" />
        <StatCard icon={<ShieldCheck size={20} />} label="На модерации" value={nf.format(c.moderation)} hint="ждут решения" href="/admin/moderation" tone={c.moderation ? "warning" : "secondary"} />
        <StatCard icon={<Download size={20} />} label="Последний импорт" value={lastRun ? <StatusBadgeAdmin status={lastRun.status} /> : "–"} hint={lastLabel} href="/admin/import" tone="info" />
        <StatCard icon={<Building2 size={20} />} label="Компании" value={nf.format(c.companies)} hint={c.pendingClaims ? `${c.pendingClaims} заявок на страницу` : "заявок нет"} href="/admin/companies" tone={c.pendingClaims ? "warning" : "success"} />
        <StatCard icon={<Users size={20} />} label="Пользователи" value={nf.format(c.candidates + c.employers)} hint={`${c.candidates} соискателей, ${c.employers} работодателей`} href="/admin/users" tone="secondary" />
        <StatCard icon={<Eye size={20} />} label="Новые отклики" value={nf.format(c.newApplications)} hint="ещё не просмотрены работодателем" href="/admin/stats" tone="success" />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card
          className="xl:col-span-2"
          padded={false}
          title="Последние изменения"
          actions={<LinkButton href="/admin/vacancies" variant="outline" size="sm">Все вакансии</LinkButton>}
        >
          {recent.length === 0 ? (
            <Empty>Вакансий пока нет.</Empty>
          ) : (
            <Table>
              <thead>
                <tr>
                  <th>Вакансия</th>
                  <th>Компания</th>
                  <th>Источник</th>
                  <th>Статус</th>
                  <th>Изменена</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((v) => (
                  <tr key={v.id}>
                    <td>
                      <Link href={`/vacancies/${v.slug}`} className="a-link font-medium">
                        {v.title}
                      </Link>
                      <div className="text-xs text-[var(--a-muted)]">{formatSalary(v.salaryFrom, v.salaryTo, v.currency)}</div>
                    </td>
                    <td className="whitespace-nowrap">{v.company.name}</td>
                    <td className="whitespace-nowrap">{v.source === "MANUAL" ? "Работодатель" : ADAPTER_BY_SOURCE[v.source as keyof typeof ADAPTER_BY_SOURCE]?.label ?? v.source}</td>
                    <td>
                      <StatusBadgeAdmin status={v.status} />
                    </td>
                    <td className="whitespace-nowrap">{dateTime(v.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>

        <Card title="Заявки «Это наша компания»" padded={false} actions={<LinkButton href="/admin/companies" variant="outline" size="sm">Все</LinkButton>}>
          {claims.length === 0 ? (
            <Empty>Новых заявок нет. Работодатели оставляют их на странице компании.</Empty>
          ) : (
            <ul className="m-0 list-none divide-y divide-[var(--a-line-soft)] p-0">
              {claims.map((cl) => (
                <li key={cl.id} className="flex flex-col gap-0.5 px-6 py-3">
                  <span className="font-medium text-[var(--a-heading)]">{cl.company.name}</span>
                  <span className="text-xs text-[var(--a-muted)]">
                    {cl.user.email} · {dateTime(cl.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
