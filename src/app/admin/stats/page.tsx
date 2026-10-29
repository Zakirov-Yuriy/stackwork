import type { Metadata } from "next";
import Link from "next/link";
import { Eye, FileText, Send, TrendingUp, Users } from "lucide-react";
import { requireRole } from "@/lib/guards";
import { PERIODS, parsePeriod, siteStats } from "@/lib/stats/queries";
import { ADAPTER_BY_SOURCE } from "@/lib/import/sources";
import { PageHeader, Card, StatCard, Table, Bars, Badge, nf, pct } from "@/components/admin/ui";
import { AreaChart, DonutChart } from "@/components/admin/charts";

export const metadata: Metadata = { title: "Статистика" };

export default async function StatsPage(props: PageProps<"/admin/stats">) {
  await requireRole("ADMIN", "/admin/stats");
  const sp = await props.searchParams;
  const period = parsePeriod(sp.period);
  const s = await siteStats(period);
  const fmt = (d: Date) => new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit", timeZone: "UTC" }).format(d);

  return (
    <>
      <PageHeader
        title="Статистика сайта"
        subtitle={`${PERIODS[period]}: ${fmt(s.from)} – ${fmt(s.to)}`}
        actions={
          <div className="inline-flex overflow-hidden rounded-md border border-[var(--a-primary)]">
            {(Object.keys(PERIODS) as Array<keyof typeof PERIODS>).map((k) => (
              <Link
                key={k}
                href={`/admin/stats?period=${k}`}
                className={`px-3 py-1.5 text-sm font-medium ${k === period ? "bg-[var(--a-primary)] text-white" : "text-[var(--a-primary-text)] hover:bg-[var(--a-primary-soft)]"}`}
              >
                {PERIODS[k]}
              </Link>
            ))}
          </div>
        }
      />

      {s.totals.views === 0 ? (
        <div className="mb-4 rounded-md bg-[var(--a-info-soft)] px-4 py-3 text-sm text-[#03a9d1]">За этот период просмотров пока нет. Они появляются, когда люди открывают сайт.</div>
      ) : null}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard icon={<Users size={20} />} label="Посетители" value={nf.format(s.totals.visitors)} hint="люди за каждый день" />
        <StatCard icon={<Eye size={20} />} label="Просмотры страниц" value={nf.format(s.totals.views)} hint="все страницы сайта" tone="info" />
        <StatCard icon={<FileText size={20} />} label="Открыли вакансию" value={nf.format(s.totals.vacancyViews)} hint="просмотры страниц вакансий" tone="secondary" />
        <StatCard icon={<Send size={20} />} label="Отклики и переходы" value={nf.format(s.totals.applications + s.totals.applyClicks)} hint={`${nf.format(s.totals.applications)} через форму, ${nf.format(s.totals.applyClicks)} к работодателю`} tone="success" />
        <StatCard icon={<TrendingUp size={20} />} label="Отклики от посетителей" value={pct(s.totals.conversion)} hint="отклики и переходы на посетителя" tone="warning" />
      </div>

      <Card className="mb-6" title="Посещения по дням" actions={<span className="text-sm font-semibold">Всего посетителей: {nf.format(s.totals.visitors)}</span>}>
        <AreaChart days={s.series.map((p) => p.day)} visitors={s.series.map((p) => p.visitors)} views={s.series.map((p) => p.views)} applications={s.series.map((p) => p.applications)} />
      </Card>

      <Card className="mb-6" title="Вакансии: какие смотрят" padded={false}>
        <Table>
          <thead>
            <tr>
              <th>Вакансия</th>
              <th>Компания</th>
              <th>Источник</th>
              <th className="text-right">Люди</th>
              <th className="text-right">Просмотры</th>
              <th className="text-right">К работодателю</th>
              <th className="text-right">Отклики</th>
              <th className="text-right">Отклики, %</th>
              <th className="text-right">С телефона</th>
            </tr>
          </thead>
          <tbody>
            {s.vacancies.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-[var(--a-muted)]">
                  Страницы вакансий за этот период не открывали.
                </td>
              </tr>
            ) : (
              s.vacancies.map((v) => (
                <tr key={v.id}>
                  <td className="max-w-[360px]">
                    <Link href={`/vacancies/${v.slug}`} className="a-link font-medium">
                      {v.title}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap">{v.company}</td>
                  <td>{v.source === "MANUAL" ? <Badge tone="primary">Работодатель</Badge> : <Badge tone="info">{ADAPTER_BY_SOURCE[v.source as keyof typeof ADAPTER_BY_SOURCE]?.label ?? v.source}</Badge>}</td>
                  <td className="text-right font-semibold">{nf.format(v.visitors)}</td>
                  <td className="text-right">{nf.format(v.views)}</td>
                  <td className="text-right">{nf.format(v.clicks)}</td>
                  <td className="text-right">{nf.format(v.applications)}</td>
                  <td className="text-right">{pct(v.conversion)}</td>
                  <td className="text-right">{pct(v.mobile)}</td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
        <p className="m-0 px-6 py-3 text-xs text-[var(--a-muted)]">«Люди»: сколько человек открыли страницу вакансии. «К работодателю»: нажали «Откликнуться» у импортированной вакансии и ушли на сайт источника. «Отклики»: через форму на сайте, только у вакансий работодателей.</p>
      </Card>

      <Card className="mb-6" title="Экраны сайта" padded={false}>
        <Table>
          <thead>
            <tr>
              <th>Экран</th>
              <th className="text-right">Люди</th>
              <th className="text-right">Просмотры</th>
              <th className="text-right">С телефона</th>
            </tr>
          </thead>
          <tbody>
            {s.screens.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-[var(--a-muted)]">
                  Данных пока нет.
                </td>
              </tr>
            ) : (
              s.screens.map((r) => (
                <tr key={r.kind}>
                  <td className="whitespace-nowrap">{r.label}</td>
                  <td className="text-right font-semibold">{nf.format(r.visitors)}</td>
                  <td className="text-right">{nf.format(r.views)}</td>
                  <td className="text-right">{pct(r.mobile)}</td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </Card>

      <div className="mb-6 grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <Card title="С каких экранов открывают вакансии">
          <Bars rows={s.cardSources.map((r) => ({ label: r.label, value: r.count }))} empty="Карточки за этот период не открывали." />
        </Card>
        <Card title="Откуда пришли на сайт">
          <Bars rows={s.sources.map((r) => ({ label: r.label, value: r.visitors }))} empty="Заходов за этот период нет." />
          <p className="m-0 mt-3 text-xs text-[var(--a-muted)]">По первой странице захода. «Прямой заход»: адрес набрали сами, открыли из закладки или источник не передан.</p>
        </Card>
        <Card title="Устройства: телефон или компьютер">
          {s.devices.some((d) => d.visitors > 0) ? <DonutChart labels={s.devices.map((d) => d.label)} series={s.devices.map((d) => d.visitors)} total="Людей" /> : null}
          <Bars rows={s.devices.map((d) => ({ label: d.label, value: d.visitors }))} empty="Посетителей за этот период нет." />
        </Card>
      </div>

      <p className="m-0 text-xs text-[var(--a-muted)]">
        Как считается: без cookie и без хранения адресов посетителей. Человек считается один раз за день, поэтому за неделю тот, кто заходил три дня, это три посетителя. Роботы поисковиков не считаются. Дни по московскому времени.
      </p>
    </>
  );
}
