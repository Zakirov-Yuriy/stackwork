import type { Metadata } from "next";
import Link from "next/link";
import { Play } from "lucide-react";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/guards";
import { ADAPTERS, ADAPTER_BY_SOURCE } from "@/lib/import/sources";
import { getImportSettings } from "@/lib/import/settings";
import { countRunningImports } from "@/lib/import/run";
import { PageHeader, Card, Table, StatusBadgeAdmin, Badge, Empty, btn, nf, dateTime } from "@/components/admin/ui";
import { runImportAction } from "./actions";
import { AutoRefresh } from "./auto-refresh";

export const metadata: Metadata = { title: "Импорт вакансий" };
export const maxDuration = 300;

export default async function ImportPage(props: PageProps<"/admin/import">) {
  await requireRole("ADMIN", "/admin/import");
  const sp = await props.searchParams;
  const settings = await getImportSettings();

  const [runs, lastBySource, published, running] = await Promise.all([
    db.importRun.findMany({ orderBy: { startedAt: "desc" }, take: 40, include: { user: { select: { email: true } } } }),
    db.importRun.findMany({ orderBy: { startedAt: "desc" }, distinct: ["source"], select: { source: true, status: true, startedAt: true, created: true, updated: true, archived: true } }),
    db.vacancy.groupBy({ by: ["source"], where: { status: "PUBLISHED" }, _count: { _all: true } }),
    countRunningImports(),
  ]);
  const last = new Map(lastBySource.map((r) => [r.source, r]));
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

      {sp.busy ? <div className="mb-4 rounded-md bg-[var(--a-warning-soft)] px-4 py-3 text-sm text-[#d99500]">Импорт уже идёт, подождите, пока он закончится.</div> : null}
      {sp.started && isRunning ? <div className="mb-4 rounded-md bg-[var(--a-info-soft)] px-4 py-3 text-sm text-[#03a9d1]">Импорт запущен. Страница обновится сама, обычно это занимает до минуты (Remotive дольше: источник просит паузу между запросами).</div> : null}

      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {ADAPTERS.map((a) => {
          const enabled = settings.enabledSources.includes(a.source);
          const l = last.get(a.source);
          const boards = a.source === "GREENHOUSE" ? settings.greenhouseBoards : a.source === "LEVER" ? settings.leverCompanies : a.source === "ASHBY" ? settings.ashbyBoards : null;
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
