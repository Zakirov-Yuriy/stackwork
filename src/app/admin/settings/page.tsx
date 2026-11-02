import type { Metadata } from "next";
import { requireRole } from "@/lib/guards";
import { getImportSettings } from "@/lib/import/settings";
import { ADAPTERS } from "@/lib/import/sources";
import { PageHeader, Card, btn } from "@/components/admin/ui";
import { saveImportSettingsAction, saveTelegramSettingsAction, connectTelegramAction, postToTelegramNowAction, repostTelegramAction } from "./actions";
import { ConfirmButton } from "./confirm-button";
import { getTelegramSettings } from "@/lib/telegram/settings";
import { getWebhookInfo, isTelegramConfigured } from "@/lib/telegram/api";
import { postedToday } from "@/lib/telegram/post";
import { db } from "@/lib/db";
import { dateTime } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Настройки" };

const label = "flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide";
const check = "flex items-start gap-2.5 text-sm normal-case tracking-normal";

export default async function SettingsPage(props: PageProps<"/admin/settings">) {
  await requireRole("ADMIN", "/admin/settings");
  const sp = await props.searchParams;
  const s = await getImportSettings();
  const tgs = await getTelegramSettings();
  const configured = isTelegramConfigured();
  const [tgTotal, tgToday, tgSums, webhook] = await Promise.all([
    db.telegramPost.count(),
    postedToday(),
    db.telegramPost.aggregate({ _sum: { clicks: true, unlocked: true } }),
    configured ? getWebhookInfo().catch(() => null) : Promise.resolve(null),
  ]);
  const tgMessage = typeof sp.tg === "string" ? sp.tg : null;

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
            Многие компании публикуют вакансии через Greenhouse, Lever, Ashby или SmartRecruiters, и у этих систем есть открытые адреса досок. Укажите идентификаторы компаний (как в адресе их страницы вакансий), по одному в строке. Отклик по таким вакансиям ведёт на сайт самого работодателя. Сейчас задано досок: Greenhouse {s.greenhouseBoards.length}, Lever {s.leverCompanies.length}, Ashby {s.ashbyBoards.length}, SmartRecruiters {s.smartrecruitersCompanies.length}. Доски обходятся по кругу, если за один запуск не успевают все.
          </p>
          <div className="grid gap-4 md:grid-cols-4">
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
            <label className={label}>
              SmartRecruiters
              <textarea name="smartrecruitersCompanies" defaultValue={s.smartrecruitersCompanies.join("\n")} className="a-textarea font-mono text-sm" placeholder="Ubisoft2" />
              <span className="text-xs font-normal normal-case tracking-normal text-[var(--a-muted)]">jobs.smartrecruiters.com/<b>Ubisoft2</b></span>
            </label>
          </div>
        </Card>

        <div className="xl:col-span-2">
          <button type="submit" className={btn("primary")}>
            Сохранить настройки
          </button>
        </div>
      </form>

      <div id="telegram" className="mt-8">
        {tgMessage ? <div className={`mb-4 rounded-md px-4 py-3 text-sm ${/^Не /.test(tgMessage) ? "bg-[var(--a-danger-soft)] text-[#ff3e1d]" : "bg-[var(--a-info-soft)] text-[#03a9d1]"}`}>{tgMessage}</div> : null}
        <form action={saveTelegramSettingsAction} className="grid gap-6 xl:grid-cols-2">
          <Card title="Telegram-канал">
            <div className="flex flex-col gap-4">
              <label className={check}>
                <input type="checkbox" name="enabled" defaultChecked={tgs.enabled} className="mt-1 h-4 w-4 accent-[var(--a-primary)]" />
                <span>
                  <span className="font-semibold text-[var(--a-heading)]">Постить вакансии в канал</span>
                  <span className="block text-xs text-[var(--a-muted)]">После каждого импорта и после одобрения вакансии работодателя. Кнопка под постом ведёт в бота, ссылку получают только подписчики.</span>
                </span>
              </label>
              <label className={label}>
                Канал
                <input name="channel" defaultValue={tgs.channel} placeholder="@stackworkjobs" className="a-input" />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className={label}>
                  Постов в сутки, не больше
                  <input name="dailyLimit" type="number" min={1} max={100} defaultValue={tgs.dailyLimit} className="a-input" />
                </label>
              </div>
              <label className={check}>
                <input type="checkbox" name="salaryFirst" defaultChecked={tgs.salaryFirst} className="mt-1 h-4 w-4 accent-[var(--a-primary)]" />
                <span>
                  <span className="font-semibold text-[var(--a-heading)]">Сначала вакансии с зарплатой</span>
                  <span className="block text-xs text-[var(--a-muted)]">Когда новых вакансий больше лимита, в канал идут те, где указана зарплата, затем самые свежие.</span>
                </span>
              </label>
              <label className={check}>
                <input type="checkbox" name="withImage" defaultChecked={tgs.withImage} className="mt-1 h-4 w-4 accent-[var(--a-primary)]" />
                <span>
                  <span className="font-semibold text-[var(--a-heading)]">Пост с картинкой</span>
                  <span className="block text-xs text-[var(--a-muted)]">Карточка вакансии в стиле сайта: логотип, должность, зарплата, стек. Та же картинка показывается при шаринге ссылки.</span>
                </span>
              </label>
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide">Кнопки под постом</span>
                <label className={check}>
                  <input type="radio" name="linkMode" value="direct" defaultChecked={tgs.linkMode === "direct"} className="mt-1 h-4 w-4 accent-[var(--a-primary)]" />
                  <span>
                    <span className="font-semibold text-[var(--a-heading)]">Прямые ссылки</span>
                    <span className="block text-xs text-[var(--a-muted)]">«Открыть на сайте» и «Откликнуться» сразу под постом. Доступны всем, кто видит пост.</span>
                  </span>
                </label>
                <label className={check}>
                  <input type="radio" name="linkMode" value="bot" defaultChecked={tgs.linkMode === "bot"} className="mt-1 h-4 w-4 accent-[var(--a-primary)]" />
                  <span>
                    <span className="font-semibold text-[var(--a-heading)]">Через бота, только подписчикам</span>
                    <span className="block text-xs text-[var(--a-muted)]">Кнопка «Открыть вакансию» ведёт в бота, он проверяет подписку на канал и выдаёт ссылки. Нужен подключённый бот.</span>
                  </span>
                </label>
              </div>
              <label className={check}>
                <input type="checkbox" name="postEmployer" defaultChecked={tgs.postEmployer} className="mt-1 h-4 w-4 accent-[var(--a-primary)]" />
                <span>
                  <span className="font-semibold text-[var(--a-heading)]">Вакансии работодателей</span>
                  <span className="block text-xs text-[var(--a-muted)]">Постить сразу после одобрения на модерации.</span>
                </span>
              </label>
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide">Источники для канала</span>
                {ADAPTERS.map((a) => (
                  <label key={a.source} className={check}>
                    <input type="checkbox" name="tgSources" value={a.source} defaultChecked={tgs.sources.includes(a.source)} className="mt-1 h-4 w-4 accent-[var(--a-primary)]" />
                    <span className="font-semibold text-[var(--a-heading)]">{a.label}</span>
                    {a.source === "REMOTIVE" ? <span className="text-xs text-[var(--a-muted)]">условия Remotive запрещают перепубликацию</span> : null}
                  </label>
                ))}
              </div>
              <div>
                <button type="submit" className={btn("primary")}>
                  Сохранить Telegram
                </button>
              </div>
            </div>
          </Card>

          <Card title="Бот и статистика">
            <div className="flex flex-col gap-3 text-sm">
              <div className="grid grid-cols-[160px_1fr] gap-y-2">
                <span className="text-[var(--a-muted)]">Токен бота</span>
                <span>{configured ? "задан (TELEGRAM_BOT_TOKEN)" : <span className="text-[#ff3e1d]">не задан: добавьте TELEGRAM_BOT_TOKEN в переменные окружения</span>}</span>
                <span className="text-[var(--a-muted)]">Бот</span>
                <span>{tgs.botUsername ? `@${tgs.botUsername}` : "не подключён"}</span>
                <span className="text-[var(--a-muted)]">Подключён</span>
                <span>{tgs.connectedAt ? dateTime(new Date(tgs.connectedAt)) : "нет"}</span>
                <span className="text-[var(--a-muted)]">Вебхук</span>
                <span>
                  {webhook ? (webhook.url ? "установлен" : "не установлен") : "нет данных"}
                  {webhook?.last_error_message ? <span className="block text-xs text-[#ff3e1d]">последняя ошибка: {webhook.last_error_message}</span> : null}
                </span>
                <span className="text-[var(--a-muted)]">Постов всего</span>
                <span>{tgTotal}</span>
                <span className="text-[var(--a-muted)]">Сегодня</span>
                <span>{tgToday} из {tgs.dailyLimit}</span>
                <span className="text-[var(--a-muted)]">Нажатий «Открыть»</span>
                <span>{tgSums._sum.clicks ?? 0}</span>
                <span className="text-[var(--a-muted)]">Выдано ссылок</span>
                <span>{tgSums._sum.unlocked ?? 0} (подписчикам)</span>
                <span className="text-[var(--a-muted)]">Последний постинг</span>
                <span>{tgs.lastRun ? `${dateTime(new Date(tgs.lastRun.at))}, отправлено ${tgs.lastRun.sent}${tgs.lastRun.error ? `, ошибка: ${tgs.lastRun.error}` : ""}` : "ещё не было"}</span>
              </div>
              <p className="m-0 text-xs text-[var(--a-muted)]">
                Подключение: создайте бота в @BotFather, положите токен в TELEGRAM_BOT_TOKEN, добавьте бота в администраторы канала с правом публикации, затем нажмите «Подключить бота». Кнопка ставит вебхук и проверяет права.
              </p>
            </div>
          </Card>
        </form>
        <div className="mt-4 flex flex-wrap gap-3">
          <form action={connectTelegramAction}>
            <button type="submit" className={btn("outline")} disabled={!configured}>
              Подключить бота
            </button>
          </form>
          <form action={postToTelegramNowAction}>
            <button type="submit" className={btn("outline")} disabled={!configured || !tgs.botUsername}>
              Отправить ожидающие вакансии сейчас
            </button>
          </form>
          {tgTotal > 0 ? (
            <form action={repostTelegramAction}>
              <ConfirmButton className={btn("danger")} message={`Удалить из канала все ${tgTotal} постов бота и отправить вакансии заново с текущими настройками? Это займёт около минуты.`}>
                Удалить посты и отправить заново
              </ConfirmButton>
            </form>
          ) : null}
        </div>
      </div>
    </>
  );
}
