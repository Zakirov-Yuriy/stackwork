import type { Metadata } from "next";
import { requireRole } from "@/lib/guards";
import { db } from "@/lib/db";
import { PageHeader, Card, btn, dateTime } from "@/components/admin/ui";
import { ConfirmButton } from "../settings/confirm-button";
import { CopyButton } from "./copy-button";
import { buildDigest } from "@/lib/content/digest";
import { lastMonth, monthByKey } from "@/lib/content/stats";
import { getContentSettings, isLlmConfigured } from "@/lib/content/llm";
import { getTelegramSettings } from "@/lib/telegram/settings";
import { isTelegramConfigured } from "@/lib/telegram/api";
import { sendDigestNowAction, toggleDigestAction, buildArticleAction, writeArticleAction, saveContentSettingsAction, deleteDraftAction } from "./actions";

export const metadata: Metadata = { title: "Контент" };
/** Нейросеть может отвечать до пары минут */
export const maxDuration = 180;

const check = "flex items-start gap-2.5 text-sm";
const label = "flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide";

export default async function ContentPage(props: PageProps<"/admin/content">) {
  await requireRole("ADMIN", "/admin/content");
  const sp = await props.searchParams;
  const msg = typeof sp.msg === "string" ? sp.msg : null;
  const monthKey = typeof sp.month === "string" && monthByKey(sp.month) ? sp.month : lastMonth().key;
  const month = monthByKey(monthKey)!;
  const [digest, tgs, content, drafts] = await Promise.all([
    buildDigest(),
    getTelegramSettings(),
    getContentSettings(),
    db.contentDraft.findMany({ orderBy: { createdAt: "desc" }, take: 40, select: { id: true, kind: true, period: true, title: true, markdown: true, model: true, sentAt: true, createdAt: true } }),
  ]);
  const articles = drafts.filter((d) => d.kind === "ARTICLE" && d.period === monthKey);
  const digests = drafts.filter((d) => d.kind === "DIGEST");
  const telegramReady = isTelegramConfigured() && Boolean(tgs.botUsername);
  const llmReady = isLlmConfigured();
  // Последние шесть завершённых месяцев
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1 - i, 1));
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    return { key, label: monthByKey(key)?.label ?? key };
  });

  return (
    <>
      <PageHeader title="Контент" subtitle="Дайджест недели для канала и статья за месяц с данными. Всё собирается из базы; нейросеть только пересказывает цифры." />
      {msg ? <div className={`mb-4 rounded-md px-4 py-3 text-sm ${/^Не /.test(msg) ? "bg-[var(--a-danger-soft)] text-[#ff3e1d]" : "bg-[var(--a-info-soft)] text-[#03a9d1]"}`}>{msg}</div> : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <Card title={`Дайджест недели · ${digest.period.label}`}>
          <div className="flex flex-col gap-4 text-sm">
            <p className="m-0 text-xs text-[var(--a-muted)]">
              Уходит в канал по понедельникам в 09:00 по Москве (крон Vercel, точность в пределах часа). Картинка подтягивается превью ссылки, текст ниже в том виде, как его увидят подписчики.
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/og/digest/${digest.period.key}.png`} alt="" className="w-full max-w-[600px] rounded-lg border border-[var(--a-border)]" />
            <div className="whitespace-pre-wrap rounded-md border border-[var(--a-border)] bg-[var(--a-bg)] p-4 leading-relaxed [&_a]:text-[var(--a-primary)]" dangerouslySetInnerHTML={{ __html: digest.html }} />
            <form action={toggleDigestAction} className="flex flex-wrap items-center gap-3">
              <label className={check}>
                <input type="checkbox" name="digestEnabled" defaultChecked={tgs.digestEnabled} className="mt-1 h-4 w-4 accent-[var(--a-primary)]" />
                <span>
                  <span className="font-semibold text-[var(--a-heading)]">Отправлять по понедельникам</span>
                  <span className="block text-xs text-[var(--a-muted)]">Один пост в неделю, повторно за ту же неделю не отправляется.</span>
                </span>
              </label>
              <button type="submit" className={btn("outline", "sm")}>
                Сохранить
              </button>
            </form>
            <div className="flex flex-wrap items-center gap-3">
              <form action={sendDigestNowAction}>
                <ConfirmButton className={btn("primary")} message={`Отправить дайджест за ${digest.period.label} в канал ${tgs.channel} прямо сейчас?`}>
                  Отправить в канал сейчас
                </ConfirmButton>
              </form>
              {!telegramReady ? <span className="text-xs text-[#ff3e1d]">Бот не подключён: Настройки, раздел Telegram</span> : null}
              {tgs.lastDigest ? <span className="text-xs text-[var(--a-muted)]">Последняя отправка: {dateTime(new Date(tgs.lastDigest.at))}{tgs.lastDigest.error ? `, ошибка: ${tgs.lastDigest.error}` : ""}</span> : null}
            </div>
            {digests.length ? (
              <div className="flex flex-col gap-1 text-xs text-[var(--a-muted)]">
                {digests.slice(0, 5).map((d) => (
                  <span key={d.id}>
                    {d.title}: {d.sentAt ? `отправлен ${dateTime(d.sentAt)}` : "не отправлен"}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </Card>

        <Card title={`Статья за месяц · ${month.label}`}>
          <div className="flex flex-col gap-4 text-sm">
            <p className="m-0 text-xs text-[var(--a-muted)]">
              Заготовка для Хабра и vc.ru: вступление, выводы, таблицы по стекам и грейдам, самые высокие вилки, компании, методика. Графики по ссылкам в тексте подставятся сами. Публикуйте после прочтения, под своим именем.
            </p>
            <form className="flex flex-wrap items-end gap-3" method="get">
              <label className={label}>
                Месяц
                <select name="month" defaultValue={monthKey} className="a-input">
                  {months.map((m) => (
                    <option key={m.key} value={m.key}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </label>
              <button type="submit" className={btn("outline", "sm")}>
                Показать
              </button>
            </form>
            <div className="flex flex-wrap items-center gap-3">
              <form action={buildArticleAction}>
                <input type="hidden" name="month" value={monthKey} />
                <button type="submit" className={btn("primary")}>
                  Собрать из данных
                </button>
              </form>
              <form action={writeArticleAction}>
                <input type="hidden" name="month" value={monthKey} />
                <button type="submit" className={btn("outline")} disabled={!llmReady} title={llmReady ? "" : "Добавьте OPENROUTER_API_KEY в переменные окружения"}>
                  Написать текст нейросетью
                </button>
              </form>
              {!llmReady ? <span className="text-xs text-[var(--a-muted)]">Для текста нужен OPENROUTER_API_KEY в переменных окружения Vercel.</span> : null}
            </div>
            <form action={saveContentSettingsAction} className="flex flex-wrap items-end gap-3">
              <input type="hidden" name="month" value={monthKey} />
              <label className={`${label} min-w-[260px]`}>
                Модель OpenRouter
                <input name="model" defaultValue={content.model} placeholder="openai/gpt-4o-mini" className="a-input" />
              </label>
              <button type="submit" className={btn("outline", "sm")}>
                Сохранить модель
              </button>
            </form>
            <p className="m-0 text-xs text-[var(--a-muted)]">
              Графики: <a className="text-[var(--a-primary)]" href={`/api/og/report/${monthKey}.png?currency=USD`} target="_blank" rel="noreferrer">доллары</a> · <a className="text-[var(--a-primary)]" href={`/api/og/report/${monthKey}.png?currency=RUB`} target="_blank" rel="noreferrer">рубли</a>
            </p>
          </div>
        </Card>
      </div>

      {articles.length ? (
        <div className="mt-6 flex flex-col gap-6">
          {articles.map((d) => (
            <Card key={d.id} title={`${d.model ? `Текст нейросети (${d.model})` : "Заготовка из данных"} · ${dateTime(d.createdAt)}`}>
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <CopyButton text={d.markdown} className={btn("primary", "sm")} />
                  <form action={deleteDraftAction}>
                    <input type="hidden" name="id" value={d.id} />
                    <input type="hidden" name="month" value={monthKey} />
                    <button type="submit" className={btn("outline", "sm")}>
                      Удалить
                    </button>
                  </form>
                  <span className="text-xs text-[var(--a-muted)]">{d.markdown.length.toLocaleString("ru-RU")} символов</span>
                </div>
                <textarea readOnly value={d.markdown} rows={18} className="a-input w-full font-mono text-xs leading-relaxed" />
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <p className="mt-6 text-sm text-[var(--a-muted)]">Черновиков за {month.label} пока нет: нажмите «Собрать из данных».</p>
      )}
    </>
  );
}
