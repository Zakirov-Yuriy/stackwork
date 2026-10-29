import type { Metadata } from "next";
import { requireRole } from "@/lib/guards";
import { getImportSettings } from "@/lib/import/settings";
import { ADAPTERS } from "@/lib/import/sources";
import { PageHeader, Card, btn } from "@/components/admin/ui";
import { saveImportSettingsAction } from "./actions";

export const metadata: Metadata = { title: "Настройки" };

const label = "flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide";
const check = "flex items-start gap-2.5 text-sm normal-case tracking-normal";

export default async function SettingsPage(props: PageProps<"/admin/settings">) {
  await requireRole("ADMIN", "/admin/settings");
  const sp = await props.searchParams;
  const s = await getImportSettings();

  return (
    <>
      <PageHeader title="Настройки" subtitle="Правила импорта вакансий. Сохраняются в базе, действуют на ежедневный запуск и кнопку «Запустить»." />
      {sp.saved ? <div className="mb-4 rounded-md bg-[var(--a-success-soft)] px-4 py-3 text-sm text-[#56ca00]">Настройки сохранены.</div> : null}

      <form action={saveImportSettingsAction} className="grid gap-6 xl:grid-cols-2">
        <Card title="Источники">
          <div className="flex flex-col gap-3">
            {ADAPTERS.map((a) => (
              <label key={a.source} className={check}>
                <input type="checkbox" name="enabledSources" value={a.source} defaultChecked={s.enabledSources.includes(a.source)} className="mt-1 h-4 w-4 accent-[var(--a-primary)]" />
                <span>
                  <span className="font-semibold text-[var(--a-heading)]">{a.label}</span>
                  <span className="block text-xs text-[var(--a-muted)]">{a.terms}</span>
                </span>
              </label>
            ))}
          </div>
        </Card>

        <Card title="Правила отбора">
          <div className="flex flex-col gap-4">
            <label className={check}>
              <input type="checkbox" name="remoteOnly" defaultChecked={s.remoteOnly} className="mt-1 h-4 w-4 accent-[var(--a-primary)]" />
              <span>
                <span className="font-semibold text-[var(--a-heading)]">Только удалённые вакансии</span>
                <span className="block text-xs text-[var(--a-muted)]">У досок работодателей бывают офисные вакансии, их пропускаем.</span>
              </span>
            </label>
            <label className={check}>
              <input type="checkbox" name="requireSalary" defaultChecked={s.requireSalary} className="mt-1 h-4 w-4 accent-[var(--a-primary)]" />
              <span>
                <span className="font-semibold text-[var(--a-heading)]">Только с указанной зарплатой</span>
                <span className="block text-xs text-[var(--a-muted)]">Строже к позиционированию сайта, но вакансий будет заметно меньше.</span>
              </span>
            </label>
            <label className={check}>
              <input type="checkbox" name="autoPublish" defaultChecked={s.autoPublish} className="mt-1 h-4 w-4 accent-[var(--a-primary)]" />
              <span>
                <span className="font-semibold text-[var(--a-heading)]">Публиковать сразу</span>
                <span className="block text-xs text-[var(--a-muted)]">Если выключить, импортированные вакансии будут ждать в очереди модерации.</span>
              </span>
            </label>
            <label className={label}>
              Языки описания
              <input name="languages" defaultValue={s.languages.join(", ")} placeholder="en, ru (пусто = любые)" className="a-input" />
              <span className="text-xs font-normal normal-case tracking-normal text-[var(--a-muted)]">Коды через запятую: en, ru, de. Источники в основном англоязычные.</span>
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className={label}>
                Не больше с источника за запуск
                <input name="maxPerSource" type="number" min={10} max={2000} defaultValue={s.maxPerSource} className="a-input" />
              </label>
              <label className={label}>
                Не старше, дней
                <input name="maxAgeDays" type="number" min={1} max={365} defaultValue={s.maxAgeDays} className="a-input" />
              </label>
            </div>
          </div>
        </Card>

        <Card title="Доски вакансий работодателей" className="xl:col-span-2">
          <p className="m-0 mb-4 text-sm">
            Многие компании публикуют вакансии через Greenhouse, Lever или Ashby, и у этих систем есть открытые адреса досок. Укажите идентификаторы компаний (как в адресе их страницы вакансий), по одному в строке. Отклик по таким вакансиям ведёт на сайт самого работодателя.
          </p>
          <div className="grid gap-4 md:grid-cols-3">
            <label className={label}>
              Greenhouse
              <textarea name="greenhouseBoards" defaultValue={s.greenhouseBoards.join("\n")} className="a-textarea font-mono text-sm" placeholder={"gitlab\ngrafanalabs"} />
              <span className="text-xs font-normal normal-case tracking-normal text-[var(--a-muted)]">boards.greenhouse.io/<b>gitlab</b></span>
            </label>
            <label className={label}>
              Lever
              <textarea name="leverCompanies" defaultValue={s.leverCompanies.join("\n")} className="a-textarea font-mono text-sm" placeholder="palantir" />
              <span className="text-xs font-normal normal-case tracking-normal text-[var(--a-muted)]">jobs.lever.co/<b>palantir</b></span>
            </label>
            <label className={label}>
              Ashby
              <textarea name="ashbyBoards" defaultValue={s.ashbyBoards.join("\n")} className="a-textarea font-mono text-sm" placeholder={"linear\nsupabase"} />
              <span className="text-xs font-normal normal-case tracking-normal text-[var(--a-muted)]">jobs.ashbyhq.com/<b>linear</b></span>
            </label>
          </div>
        </Card>

        <div className="xl:col-span-2">
          <button type="submit" className={btn("primary")}>
            Сохранить настройки
          </button>
        </div>
      </form>
    </>
  );
}
