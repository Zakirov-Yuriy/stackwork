import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { languageAlternates } from "@/i18n/seo";
import type { Locale } from "@/i18n/routing";
import { db } from "@/lib/db";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { VacancyCard } from "@/components/vacancy-card";
import { makeLabels, CURRENCY_SIGN } from "@/lib/labels";
import { vacancyCardSelect } from "@/lib/vacancies";
import { savedIdsFor } from "@/lib/saved";
import { getCurrentUser } from "@/lib/session";
import { getSkill, getSalaries, type SalaryStat } from "@/lib/landing";

/**
 * Зарплаты по одной технологии: медиана и процентили, по грейдам, удалённо и в офисе,
 * динамика за полгода и самые высокие вилки. Цифры из опубликованных вакансий, кеш на час.
 */

const INTL: Record<string, string> = { ru: "ru-RU", en: "en-US" };

const RU_MONTHS_GEN = ["январе", "феврале", "марте", "апреле", "мае", "июне", "июле", "августе", "сентябре", "октябре", "ноябре", "декабре"];

/** «ноябре 2026» (после «в») / "November 2026" */
function monthLabel(locale: Locale, date = new Date()): string {
  if (locale === "ru") return `${RU_MONTHS_GEN[date.getMonth()]} ${date.getFullYear()}`;
  return new Intl.DateTimeFormat(INTL[locale] ?? "en-US", { month: "long", year: "numeric" }).format(date);
}

function money(locale: Locale, s: SalaryStat, value: number): string {
  return `${new Intl.NumberFormat(INTL[locale] ?? "ru-RU").format(value)} ${CURRENCY_SIGN[s.currency] ?? s.currency}`;
}

async function load(slug: string) {
  const skill = await getSkill(slug);
  if (!skill) return null;
  const data = await getSalaries(skill);
  return data ? { skill, data } : null;
}

export async function generateMetadata(props: PageProps<"/[locale]/salaries/[skill]">): Promise<Metadata> {
  const { skill: slug } = await props.params;
  const [loaded, t, locale] = await Promise.all([load(slug), getTranslations("salaries"), getLocale() as Promise<Locale>]);
  if (!loaded) return { title: "Stackwork", robots: { index: false, follow: false } };
  const { data } = loaded;
  const s = data.salary!;
  const median = `${money(locale, s, s.median)}${s.period === "YEAR" ? ` ${t("page.periodYear")}` : ""}`;
  const tj = await getTranslations("jobs");
  return {
    title: t("page.title", { skill: data.skill.name, month: monthLabel(locale), median }),
    description: t("page.description", { skill: data.skill.name, median, count: tj("count", { count: s.count }) }),
    alternates: languageAlternates(`/salaries/${data.skill.slug}`, locale),
  };
}

function Bar({ label, stat, max, locale, muted }: { label: string; stat: SalaryStat | null; max: number; locale: Locale; muted: string }) {
  return (
    <div className="grid grid-cols-[110px_1fr_auto] items-center gap-3 sm:grid-cols-[140px_1fr_auto]">
      <span className="text-sm font-semibold">{label}</span>
      <span className="neu-inset relative h-3 overflow-hidden rounded-full">
        {stat ? <span className="absolute inset-y-0 rounded-full bg-[linear-gradient(135deg,#5a8df2,#2d62d0)]" style={{ left: `${(stat.p25 / max) * 100}%`, width: `${Math.max(2, ((stat.p75 - stat.p25) / max) * 100)}%` }} /> : null}
        {stat ? <span className="absolute inset-y-[-2px] w-[3px] rounded bg-[color:var(--soft-text)]" style={{ left: `calc(${(stat.median / max) * 100}% - 1px)` }} /> : null}
      </span>
      <span className={`whitespace-nowrap font-mono text-sm font-semibold ${stat ? "" : muted}`}>{stat ? `${money(locale, stat, stat.median)} · ${stat.count}` : "—"}</span>
    </div>
  );
}

export default async function SkillSalariesPage(props: PageProps<"/[locale]/salaries/[skill]">) {
  const { skill: slug } = await props.params;
  const loaded = await load(slug);
  if (!loaded) notFound();
  const { data } = loaded;
  const s = data.salary!;
  const [t, tj, locale, user] = await Promise.all([getTranslations("salaries"), getTranslations("jobs"), getLocale() as Promise<Locale>, getCurrentUser()]);
  const L = makeLabels(locale);
  const muted = "text-[color:var(--soft-muted)]";
  const period = s.period === "YEAR" ? t("page.periodYear") : t("page.periodMonth");
  const max = Math.max(s.p75, ...data.byGrade.map((g) => g.stat?.p75 ?? 0), data.byFormat.remote?.p75 ?? 0, data.byFormat.office?.p75 ?? 0) * 1.1;
  const trendMax = Math.max(1, ...data.trend.map((m) => m.median ?? 0));
  const monthShort = new Intl.DateTimeFormat(INTL[locale] ?? "ru-RU", { month: "short" });
  const topPaid = data.topPaid.length ? await db.vacancy.findMany({ where: { slug: { in: data.topPaid }, status: "PUBLISHED" }, select: vacancyCardSelect }) : [];
  const order = new Map(data.topPaid.map((sl, i) => [sl, i]));
  topPaid.sort((a, b) => (order.get(a.slug) ?? 0) - (order.get(b.slug) ?? 0));
  const saved = await savedIdsFor(user?.id, topPaid.map((v) => v.id));
  const now = new Date();

  return (
    <>
      <SiteHeader />
      <main className="mx-auto box-border flex w-full max-w-[1180px] flex-1 flex-col gap-8 px-6 pb-14 pt-8">
        <nav aria-label={t("meta.title")} className={`flex flex-wrap items-center gap-2 text-[13px] ${muted}`}>
          <Link href="/salaries" className="hover:text-[color:var(--soft-text)]">
            {t("meta.title")}
          </Link>
          <span aria-hidden="true">/</span>
          <span className="text-[color:var(--soft-text)]">{data.skill.name}</span>
        </nav>

        <div className="flex max-w-[820px] flex-col gap-3">
          <h1 className="m-0 text-[36px] font-extrabold leading-tight tracking-tight">{t("page.h1", { skill: data.skill.name })}</h1>
          <p className={`m-0 text-[16px] leading-relaxed ${muted}`}>{t("page.lead", { count: tj("count", { count: s.count }), month: monthLabel(locale), period })}</p>
        </div>

        <div className={`grid grid-cols-1 gap-4 ${data.salaryAlt ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-3"}`}>
          <div className="neu-card flex flex-col gap-1 px-6 py-5">
            <span className={`text-[12px] font-extrabold uppercase tracking-[0.08em] ${muted}`}>{t("page.median")}</span>
            <span className="font-mono text-[28px] font-semibold text-[color:var(--soft-blue)]">{money(locale, s, s.median)}</span>
            <span className={`text-[13px] ${muted}`}>{period}</span>
          </div>
          <div className="neu-card flex flex-col gap-1 px-6 py-5">
            <span className={`text-[12px] font-extrabold uppercase tracking-[0.08em] ${muted}`}>{t("page.range")}</span>
            <span className="font-mono text-[22px] font-semibold">
              {L.nf.format(s.p25)} – {money(locale, s, s.p75)}
            </span>
            <span className={`text-[13px] ${muted}`}>{t("page.rangeHint")}</span>
          </div>
          {data.salaryAlt ? (
            <div className="neu-card flex flex-col gap-1 px-6 py-5">
              <span className={`text-[12px] font-extrabold uppercase tracking-[0.08em] ${muted}`}>{t("page.otherCurrencies")}</span>
              <span className="font-mono text-[22px] font-semibold">{money(locale, data.salaryAlt, data.salaryAlt.median)}</span>
              <span className={`text-[13px] ${muted}`}>
                {data.salaryAlt.period === "YEAR" ? t("page.periodYear") : t("page.periodMonth")} · {tj("count", { count: data.salaryAlt.count })}
              </span>
            </div>
          ) : null}
          <div className="neu-card flex flex-col gap-1 px-6 py-5">
            <span className={`text-[12px] font-extrabold uppercase tracking-[0.08em] ${muted}`}>{t("page.count")}</span>
            <span className="font-mono text-[22px] font-semibold">{L.nf.format(s.count)}</span>
            <Link href={`/jobs/${data.skill.slug}`} className="soft-link text-[13px] font-semibold">
              {t("page.jobsLink", { skill: data.skill.name, count: L.nf.format(data.total) })}
            </Link>
          </div>
        </div>

        <section className="neu-card flex flex-col gap-4 p-6">
          <h2 className="m-0 text-lg font-extrabold">{t("page.byGrade")}</h2>
          {data.byGrade.map((g) => (
            <Bar key={g.grade} label={L.GRADE_LABEL[g.grade]} stat={g.stat} max={max} locale={locale} muted={muted} />
          ))}
          <p className={`m-0 text-[13px] ${muted}`}>{t("page.rangeHint")} · {t("page.median").toLowerCase()}</p>
        </section>

        <section className="neu-card flex flex-col gap-4 p-6">
          <h2 className="m-0 text-lg font-extrabold">{t("page.byFormat")}</h2>
          <Bar label={t("page.remote")} stat={data.byFormat.remote} max={max} locale={locale} muted={muted} />
          <Bar label={t("page.office")} stat={data.byFormat.office} max={max} locale={locale} muted={muted} />
        </section>

        <section className="neu-card flex flex-col gap-4 p-6">
          <div className="flex flex-col gap-1">
            <h2 className="m-0 text-lg font-extrabold">{t("page.trend")}</h2>
            <p className={`m-0 text-[13px] ${muted}`}>{t("page.trendHint")}</p>
          </div>
          <div className="grid grid-cols-6 items-end gap-3" style={{ height: 180 }}>
            {data.trend.map((m) => {
              const h = m.median ? Math.max(6, (m.median / trendMax) * 130) : 0;
              return (
                <div key={m.month} className="flex h-full flex-col items-center justify-end gap-2">
                  <span className={`font-mono text-[11px] font-semibold ${m.median ? "" : muted}`}>{m.median ? L.nf.format(m.median) : "—"}</span>
                  <span className="w-full rounded-t-lg bg-[linear-gradient(180deg,#5a8df2,#2d62d0)]" style={{ height: h, opacity: m.median ? 1 : 0 }} />
                  <span className={`text-[12px] ${muted}`}>{monthShort.format(new Date(`${m.month}-01T00:00:00Z`))}</span>
                </div>
              );
            })}
          </div>
        </section>

        {topPaid.length ? (
          <section className="flex flex-col gap-4">
            <h2 className="m-0 text-xl font-extrabold">{t("page.topPaid")}</h2>
            {topPaid.map((v) => (
              <VacancyCard key={v.id} vacancy={v} now={now} saved={saved.has(v.id)} back={`/salaries/${data.skill.slug}`} from="salaries" />
            ))}
          </section>
        ) : null}

        <p className={`m-0 max-w-[820px] text-[13px] leading-relaxed ${muted}`}>{t("page.method", { skill: data.skill.name })}</p>
      </main>
      <SiteFooter />
    </>
  );
}
