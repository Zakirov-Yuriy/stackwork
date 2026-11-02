import type { Metadata } from "next";
import Link from "next/link";
import { Play } from "lucide-react";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/guards";
import { ADAPTERS, ADAPTER_BY_SOURCE } from "@/lib/import/sources";
import { getImportSettings } from "@/lib/import/settings";
import { countRunningImports } from "@/lib/import/run";
import { PageHeader, Card, Table, StatusBadgeAdmin, Badge, Empty, btn, nf, dateTime } from "@/components/admin/ui";
import { StackedBarChart } from "@/components/admin/charts";
import { dailyNewVacancies } from "@/lib/stats/daily";
import type { VacancySource } from "@/generated/prisma/client";
import { runImportAction } from "./actions";
import { AutoRefresh } from "./auto-refresh";

export const metadata: Metadata = { title: "Импорт вакансий" };
export const maxDuration = 300;

export default async function ImportPage(props: PageProps<"/admin/import">) {
  await requireRole("ADMIN", "/admin/import");
  const sp = await props.searchParams;
  const settings = await getImportSettings();

  const [runs, lastBySource, published, running, daily] = await Promise.all([
    db.importRun.findMany({ orderBy: { startedAt: "desc" }, take: 40, include: { user: { select: { email: true } } } }),
    db.importRun.findMany({ orderBy: { startedAt: "desc" }, distinct: ["source"], select: { source: true, status: true, startedAt: true, created: true, updated: true, archived: true } }),
    db.vacancy.groupBy({ by: ["source"], where: { status: "PUBLISHED" }, _count: { _all: true } }),
    countRunningImports(),
    dailyNewVacancies(30),
  ]);
  const last = new Map(lastBySource.map((r) => [r.source, r]));
  // Источники, у которых за 30 дней были новые вакансии: колонки таблицы и серии графика
  const activeSources = ADAPTERS.map((a) => a.source).filter((src) => daily.some((d) => (d.bySource[src] ?? 0) > 0));
  const chartSeries = [
    ...activeSources.map((src) => ({ name: ADAPTER_BY_SOURCE[src as keyof typeof ADAPTER_BY_SOURCE].label, data: daily.map((d) => d.bySource[src] ?? 0) })),
    ...(daily.some((d) => d.manual > 0) ? [{ name: "Работодатели", data: daily.map((d) => d.manual) }] : []),
  ];
  const month = daily.reduce((a, d) => a + d.total, 0);
  const week = daily.slice(-7).reduce((a, d) => a + d.total, 0);
  const todayRow = daily[daily.length - 1];
  const dayLabel = (d: string) => new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit", weekday: "short", timeZone: "UTC" }).format(new Date(`${d}T00:00:00Z`));
  const count = new Map(published.map((p) => [p.source, p._count._all]));
  const isRunning = running > 0;

  return (
    <>
      <AutoRefresh active={isRunning} />
      <PageHeader
        title="Импорт вакансий"
        subtitle="Открытые API площадок удалённых IT-вакансий и доски вакансий работодателей. Ежедневный запуск по расписанию, кнопка для запуска сейчас."
        actions={
          <form action={runImportAction}>
            <button type="submit" disabled={isRunning} className={btn("primary")}>
              <Play size={16} /> {isRunning ? "Импорт идёт…" : "Запустить все включённые"}
            </button>
          </form>
        }
      />

      {sp.busy && isRunning ? <div className="mb-4 rounded-md bg-[var(--a-warning-soft)] px-4 py-3 text-sm text-[#d99500]">Импорт уже идёт, подождите, пока он закончится.</div> : null}
      {sp.started && isRunning ? <div className="mb-4 rounded-md bg-[var(--a-info-soft)] px-4 py-3 text-sm text-[#03a9d1]">Импорт запущен. Страница обновится сама, обычно это занимает одну-две минуты.</div> : null}

      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {ADAPTERS.map((a) => {
          const enabled = settings.enabledSources.includes(a.source);
          const l = last.get(a.source);
          const boards =
            a.source === "GREENHOUSE" ? settings.greenhouseBoards : a.source === "LEVER" ? settings.leverCompanies : a.source === "ASHBY" ? settings.ashbyBoards : a.source === "SMARTRECRUITERS" ? settings.smartrecruitersCompanies : null;
          return (
            <div key={a.source} className="a-card flex flex-col gap-3 p-5">
              <div className="flex items-center justify-between gap-2">
                <a href={a.homepage} target="_blank" rel="noopener noreferrer" className="text-[16px] font-semibold text-[var(--a-heading)] hover:underline">
                  {a.label}
                </a>
                {enabled ? <Badge tone="success">Включён</Badge> : <Badge>Выключен</Badge>}
              </div>
              <div className="text-[26px] font-semibold leading-none text-[var(--a-heading)]">{nf.format(count.get(a.source) ?? 0)}</div>
              <div className="text-xs text-[var(--a-muted)]">опубликовано сейчас</div>
              {boards ? (
                <div className="text-xs">
                  Доски: {boards.length ? boards.join(", ") : <span className="text-[var(--a-danger)]">не заданы</span>}
                </div>
              ) : null}
              <div className="text-xs">
                {l ? (
                  <>
                    Последний запуск: <StatusBadgeAdmin status={l.status} /> {dateTime(l.startedAt)}
                    <br />
                    новых {l.created}, обновлено {l.updated}, в архив {l.archived}
                  </>
                ) : (
                  "Ещё не запускался"
                )}
              </div>
              <p className="m-0 text-xs text-[var(--a-muted)]">{a.terms}</p>
              <form action={runImportAction} className="mt-auto">
                <input type="hidden" name="source" value={a.source} />
                <button type="submit" disabled={isRunning || (a.needsBoards && !boards?.length)} className={btn("outline", "sm")}>
                  <Play size={14} /> Запустить
                </button>
              </form>
            </div>
          );
        })}
      </div>

      <Card
        className="mb-6"
        title="Новые вакансии по дням"
        actions={
          <span className="text-sm">
            Сегодня <b className="text-[var(--a-heading)]">{nf.format(todayRow?.total ?? 0)}</b> · за 7 дней <b className="text-[var(--a-heading)]">{nf.format(week)}</b> · за 30 дней{" "}
            <b className="text-[var(--a-heading)]">{nf.format(month)}</b>
          </span>
        }
      >
        {month === 0 ? (
          <p className="m-0 text-sm text-[var(--a-muted)]">За 30 дней новых вакансий не было. Запустите импорт, и здесь появится график.</p>
        ) : (
          <StackedBarChart days={daily.map((d) => d.day)} series={chartSeries} />
        )}
      </Card>

      <Card className="mb-6" title="Таблица по дням" padded={false}>
        <Table>
          <thead>
            <tr>
              <th>День</th>
              <th className="text-right">Новых всего</th>
              {activeSources.map((src) => (
                <th key={src} className="text-right">
                  {ADAPTER_BY_SOURCE[src as keyof typeof ADAPTER_BY_SOURCE].label}
                </th>
              ))}
              <th className="text-right">Работодатели</th>
              <th className="text-right">Обновлено</th>
              <th className="text-right">В архив</th>
              <th className="text-right">Запусков</th>
            </tr>
          </thead>
          <tbody>
            {[...daily].reverse().filter((d, i) => i < 14 || d.total > 0 || d.runs > 0).map((d) => (
              <tr key={d.day}>
                <td className="whitespace-nowrap">{dayLabel(d.day)}</td>
                <td className="text-right font-semibold text-[var(--a-heading)]">{nf.format(d.total)}</td>
                {activeSources.map((src: VacancySource) => (
                  <td key={src} className="text-right">
                    {d.bySource[src] ? nf.format(d.bySource[src] ?? 0) : "–"}
                  </td>
                ))}
                <td className="text-right">{d.manual ? nf.format(d.manual) : "–"}</td>
                <td className="text-right">{d.updated ? nf.format(d.updated) : "–"}</td>
                <td className="text-right">{d.archived ? nf.format(d.archived) : "–"}</td>
                <td className="text-right">
                  {d.runs ? nf.format(d.runs) : "–"}
                  {d.errors ? <span className="ml-1 text-[var(--a-danger)]">({d.errors} с ошибкой)</span> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
        <p className="m-0 px-6 py-3 text-xs text-[var(--a-muted)]">«Новых всего»: вакансии, впервые появившиеся на сайте в этот день (импорт по дате импорта, работодатели по дате публикации). Дни по московскому времени. Показаны последние 14 дней и дни с активностью.</p>
      </Card>

      <Card title="Журнал запусков" padded={false} actions={<Link href="/admin/settings" className="a-link text-sm">Настройки импорта</Link>}>
        {runs.length === 0 ? (
          <Empty>Запусков ещё не было.</Empty>
        ) : (
          <Table>
            <thead>
              <tr>
                <th>Когда</th>
                <th>Источник</th>
                <th>Статус</th>
                <th>Кто</th>
                <th className="text-right">Получено</th>
                <th className="text-right">Новых</th>
                <th className="text-right">Обновлено</th>
                <th className="text-right">Пропущено</th>
                <th className="text-right">В архив</th>
                <th>Заметки</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((r) => (
                <tr key={r.id}>
                  <td className="whitespace-nowrap">
                    {dateTime(r.startedAt)}
                    {r.finishedAt ? <div className="text-xs text-[var(--a-muted)]">{Math.max(1, Math.round((r.finishedAt.getTime() - r.startedAt.getTime()) / 1000))} с</div> : null}
                  </td>
                  <td className="whitespace-nowrap">{ADAPTER_BY_SOURCE[r.source as keyof typeof ADAPTER_BY_SOURCE]?.label ?? r.source}</td>
                  <td>
                    <StatusBadgeAdmin status={r.status} />
                  </td>
                  <td className="whitespace-nowrap text-xs">{r.trigger === "CRON" ? "по расписанию" : r.user?.email ?? "админ"}</td>
                  <td className="text-right">{r.fetched}</td>
                  <td className="text-right">{r.created}</td>
                  <td className="text-right">{r.updated}</td>
                  <td className="text-right">{r.skipped}</td>
                  <td className="text-right">{r.archived}</td>
                  <td className="max-w-[360px] whitespace-pre-line text-xs">
                    {r.error ? <span className="text-[var(--a-danger)]">{r.error}</span> : null}
                    {r.notes}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
