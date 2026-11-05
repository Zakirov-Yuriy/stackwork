import type { Metadata } from "next";
import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { languageAlternates } from "@/i18n/seo";
import type { Locale } from "@/i18n/routing";
import { db } from "@/lib/db";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { makeLabels } from "@/lib/labels";
import { MIN_SALARIED } from "@/lib/landing";

export async function generateMetadata(): Promise<Metadata> {
  const [t, locale] = await Promise.all([getTranslations("salaries"), getLocale()]);
  return { title: t("meta.title"), description: t("meta.description"), alternates: languageAlternates("/salaries", locale) };
}

function median(xs: number[]) {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
}

type Row = { slug: string; name: string; count: number; median: number; from: number; to: number };

/** Таблица по одной валюте: рубли в месяц, доллары в год (середина вилки, медианы) */
function statsFor(rows: Array<{ skill: { slug: string; name: string }; vacancy: { salaryFrom: number | null; salaryTo: number | null; currency: string; salaryPeriod: "MONTH" | "YEAR" | "HOUR" } }>, currency: string): Row[] {
  const bySkill = new Map<string, { name: string; slug: string; mids: number[]; froms: number[]; tos: number[] }>();
  for (const r of rows) {
    if (r.vacancy.currency !== currency) continue;
    const k = currency === "RUB" ? (r.vacancy.salaryPeriod === "YEAR" ? 1 / 12 : r.vacancy.salaryPeriod === "HOUR" ? 168 : 1) : r.vacancy.salaryPeriod === "MONTH" ? 12 : r.vacancy.salaryPeriod === "HOUR" ? 2080 : 1;
    const from = Math.round((r.vacancy.salaryFrom ?? r.vacancy.salaryTo!) * k);
    const to = Math.round((r.vacancy.salaryTo ?? r.vacancy.salaryFrom!) * k);
    const e = bySkill.get(r.skill.slug) ?? { name: r.skill.name, slug: r.skill.slug, mids: [], froms: [], tos: [] };
    e.mids.push(Math.round((from + to) / 2));
    e.froms.push(from);
    e.tos.push(to);
    bySkill.set(r.skill.slug, e);
  }
  return [...bySkill.values()]
    .filter((e) => e.mids.length >= MIN_SALARIED)
    .map((e) => ({ name: e.name, slug: e.slug, count: e.mids.length, median: median(e.mids)!, from: median(e.froms)!, to: median(e.tos)! }))
    .sort((a, b) => b.count - a.count || b.median - a.median);
}

function Table({ rows, sign, title, L, t }: { rows: Row[]; sign: string; title: string; L: ReturnType<typeof makeLabels>; t: Awaited<ReturnType<typeof getTranslations<"salaries">>> }) {
  const max = Math.max(1, ...rows.map((s) => s.to));
  return (
    <section className="flex flex-col gap-3">
      <h2 className="m-0 text-lg font-extrabold">{title}</h2>
      <div className="neu-card flex flex-col gap-1 p-6">
        <div className="hidden grid-cols-[1fr_2fr_auto] gap-4 px-3 pb-2 text-[12px] font-extrabold uppercase tracking-[0.08em] text-[color:var(--soft-muted)] sm:grid">
          <span>{t("columns.skill")}</span>
          <span>{t("columns.range")}</span>
          <span className="text-right">{t("columns.count")}</span>
        </div>
        {rows.map((s) => (
          <Link
            key={s.slug}
            href={`/salaries/${s.slug}`}
            className="grid grid-cols-1 items-center gap-2 rounded-xl px-3 py-3 text-[color:var(--soft-text)] hover:bg-[color:var(--soft-bg-raised)] sm:grid-cols-[1fr_2fr_auto] sm:gap-4"
          >
            <span className="font-mono text-[15px] font-semibold">{s.name}</span>
            <span className="flex items-center gap-3">
              <span className="neu-inset relative h-3 flex-1 overflow-hidden rounded-full">
                <span
                  className="absolute inset-y-0 rounded-full bg-[linear-gradient(135deg,#5a8df2,#2d62d0)]"
                  style={{ left: `${(s.from / max) * 100}%`, width: `${Math.max(2, ((s.to - s.from) / max) * 100)}%` }}
                />
              </span>
              <span className="whitespace-nowrap font-mono text-sm font-semibold">
                {L.nf.format(s.from)} – {L.nf.format(s.to)} {sign}
              </span>
            </span>
            <span className="text-sm text-[color:var(--soft-muted)] sm:text-right">{L.formatVacancyCount(s.count)}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default async function SalariesPage() {
  const [t, locale] = await Promise.all([getTranslations("salaries"), getLocale()]);
  const L = makeLabels(locale as Locale);
  const rows = await db.vacancySkill.findMany({
    where: { vacancy: { status: "PUBLISHED", OR: [{ salaryFrom: { not: null } }, { salaryTo: { not: null } }] } },
    select: { skill: { select: { slug: true, name: true } }, vacancy: { select: { salaryFrom: true, salaryTo: true, currency: true, salaryPeriod: true } } },
  });
  const rub = statsFor(rows, "RUB");
  const usd = statsFor(rows, "USD");

  return (
    <>
      <SiteHeader />
      <main className="mx-auto box-border flex w-full max-w-[1180px] flex-1 flex-col gap-7 px-6 pb-14 pt-8">
        <div className="flex max-w-[760px] flex-col gap-2">
          <h1 className="m-0 text-[36px] font-extrabold leading-tight tracking-tight">{t("meta.title")}</h1>
          <p className="m-0 text-[16px] leading-relaxed text-[color:var(--soft-muted)]">{t("lead")}</p>
          <p className="m-0 text-[13px] leading-relaxed text-[color:var(--soft-muted)]">{t("intro.note")}</p>
        </div>

        {rub.length === 0 && usd.length === 0 ? <div className="neu-card-sm p-8 text-sm text-[color:var(--soft-muted)]">{t("empty")}</div> : null}
        {rub.length ? <Table rows={rub} sign="₽" title={t("intro.rub")} L={L} t={t} /> : null}
        {usd.length ? <Table rows={usd} sign="$" title={t("intro.usd")} L={L} t={t} /> : null}
      </main>
      <SiteFooter />
    </>
  );
}
