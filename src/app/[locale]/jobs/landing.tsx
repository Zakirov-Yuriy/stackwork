import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { languageAlternates } from "@/i18n/seo";
import type { Locale } from "@/i18n/routing";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { VacancyCard } from "@/components/vacancy-card";
import { ChevronRightIcon } from "@/components/icons";
import { searchVacancies } from "@/lib/vacancies";
import { savedIdsFor } from "@/lib/saved";
import { getCurrentUser } from "@/lib/session";
import { makeLabels, CURRENCY_SIGN, type Labels } from "@/lib/labels";
import { getSkill, getLanding, resolveFacet, MIN_JOBS, MIN_SALARIED, type Facet, type SkillLanding, type SalaryStat } from "@/lib/landing";

/**
 * Посадочная страница по технологии: /jobs/<skill>, /jobs/<skill>/remote, /jobs/<skill>/<город>.
 * Своя разметка и текст из цифр базы, список вакансий и перелинковка с соседними страницами.
 */

export function landingPath(skill: string, facet: Facet | null): string {
  if (!facet) return `/jobs/${skill}`;
  return `/jobs/${skill}/${facet.kind === "remote" ? "remote" : facet.slug}`;
}

/** «250 000 ₽» или «$180 000 в год» */
export function formatStat(L: Labels, s: SalaryStat, value: number): string {
  return `${L.nf.format(value)} ${CURRENCY_SIGN[s.currency] ?? s.currency}${L.periodSuffix(s.period, true)}`;
}

async function load(skillSlug: string, facetSlug?: string): Promise<{ data: SkillLanding; facet: Facet | null } | null> {
  const skill = await getSkill(skillSlug);
  if (!skill) return null;
  const facet = facetSlug ? await resolveFacet(skill.id, facetSlug) : null;
  if (facetSlug && !facet) return null;
  const data = await getLanding(skill, facet);
  if (data.total < MIN_JOBS) return null;
  return { data, facet };
}

export async function landingMetadata(skillSlug: string, facetSlug?: string): Promise<Metadata> {
  const [loaded, t, locale] = await Promise.all([load(skillSlug, facetSlug), getTranslations("jobs"), getLocale() as Promise<Locale>]);
  if (!loaded) return { title: "Stackwork", robots: { index: false, follow: false } };
  const { data, facet } = loaded;
  const L = makeLabels(locale);
  const count = t("count", { count: data.total });
  const title = facet?.kind === "remote" ? t("meta.titleRemote", { skill: data.skill.name, count }) : facet?.kind === "city" ? t("meta.titleCity", { skill: data.skill.name, city: facet.city, count }) : t("meta.title", { skill: data.skill.name, count });
  const description = t("meta.description", {
    count,
    skill: data.skill.name,
    median: data.salary ? t("meta.medianPart", { median: [data.salary, data.salaryAlt].filter((x): x is SalaryStat => Boolean(x)).map((x) => formatStat(L, x, x.median)).join(" / ") }) : "",
    remote: t("count", { count: data.remote }),
  });
  return { title, description, alternates: languageAlternates(landingPath(data.skill.slug, facet), locale) };
}

function buildQuery(page: number): string {
  return page > 1 ? `?page=${page}` : "";
}

export async function Landing({ skillSlug, facetSlug, searchParams }: { skillSlug: string; facetSlug?: string; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [loaded, raw] = await Promise.all([load(skillSlug, facetSlug), searchParams]);
  if (!loaded) notFound();
  const { data, facet } = loaded;
  const [t, locale, user] = await Promise.all([getTranslations("jobs"), getLocale() as Promise<Locale>, getCurrentUser()]);
  const L = makeLabels(locale);
  const now = new Date();
  const pageRaw = typeof raw.page === "string" ? Number(raw.page) : 1;
  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : 1;
  const sort = raw.sort === "salary" ? "salary" : "date";
  const result = await searchVacancies({
    skills: [data.skill.slug],
    format: facet?.kind === "remote" ? ["REMOTE"] : [],
    city: facet?.kind === "city" ? facet.city : undefined,
    sort,
    page,
  });
  const saved = await savedIdsFor(user?.id, result.items.map((v) => v.id));
  const base = landingPath(data.skill.slug, facet);
  const back = `${base}${buildQuery(page)}`;

  const h1 = facet?.kind === "remote" ? t("h1Remote", { skill: data.skill.name }) : facet?.kind === "city" ? t("h1City", { skill: data.skill.name, city: facet.city }) : t("h1", { skill: data.skill.name });
  const facetText = facet?.kind === "remote" ? t("lead.facetRemote") : facet?.kind === "city" ? t("lead.facetCity", { city: facet.city }) : "";
  const lead = [
    t("lead.total", { count: t("count", { count: data.total }), skill: data.skill.name, facet: facetText }),
    data.salary
      ? t("lead.salary", { median: formatStat(L, data.salary, data.salary.median), salaried: t("count", { count: data.salary.count }), p25: L.nf.format(data.salary.p25), p75: formatStat(L, data.salary, data.salary.p75) })
      : data.withSalary
        ? t("lead.noSalary", { salaried: t("count", { count: data.withSalary }) })
        : "",
    data.salaryAlt ? t("lead.salaryAlt", { median: formatStat(L, data.salaryAlt, data.salaryAlt.median), salaried: t("count", { count: data.salaryAlt.count }) }) : "",
    facet?.kind !== "remote" && data.total ? t("lead.remote", { remote: t("count", { count: data.remote }), share: Math.round((data.remote / data.total) * 100) }) : "",
    data.related.length ? t("lead.related", { skill: data.skill.name, skills: data.related.slice(0, 5).map((r) => r.name).join(", ") }) : "",
    data.topCompanies.length ? t("lead.companies", { companies: data.topCompanies.slice(0, 4).map((c) => c.name).join(", ") }) : "",
  ].filter(Boolean);

  const pageLinks = Array.from({ length: result.pages }, (_, i) => i + 1).filter((n) => n <= 4 || n === result.pages || Math.abs(n - result.page) <= 1);
  const muted = "text-[color:var(--soft-muted)]";
  const chip = (href: string, label: string, active: boolean) => (
    <Link key={href} href={href} className="neu-pill" data-active={active ? "true" : undefined} aria-current={active ? "page" : undefined}>
      {label}
    </Link>
  );

  return (
    <>
      <SiteHeader />
      <main className="mx-auto box-border flex w-full max-w-[1180px] flex-1 flex-col gap-7 px-6 pb-14 pt-8">
        <nav aria-label={t("breadcrumbs.home")} className={`flex flex-wrap items-center gap-2 text-[13px] ${muted}`}>
          <Link href="/" className="hover:text-[color:var(--soft-text)]">
            {t("breadcrumbs.home")}
          </Link>
          <span aria-hidden="true">/</span>
          <Link href="/jobs" className="hover:text-[color:var(--soft-text)]">
            {t("breadcrumbs.skills")}
          </Link>
          <span aria-hidden="true">/</span>
          {facet ? (
            <>
              <Link href={landingPath(data.skill.slug, null)} className="hover:text-[color:var(--soft-text)]">
                {data.skill.name}
              </Link>
              <span aria-hidden="true">/</span>
              <span className="text-[color:var(--soft-text)]">{facet.kind === "remote" ? t("sections.remote") : facet.city}</span>
            </>
          ) : (
            <span className="text-[color:var(--soft-text)]">{data.skill.name}</span>
          )}
        </nav>

        <div className="flex max-w-[820px] flex-col gap-3">
          <h1 className="m-0 text-[36px] font-extrabold leading-tight tracking-tight">{h1}</h1>
          <p className={`m-0 text-[16px] leading-relaxed ${muted}`}>{lead.join(" ")}</p>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="neu-card-sm flex flex-col gap-1 px-5 py-4">
            <span className={`text-[12px] font-extrabold uppercase tracking-[0.08em] ${muted}`}>{t("sections.list")}</span>
            <span className="font-mono text-[22px] font-semibold">{L.nf.format(data.total)}</span>
          </div>
          <div className="neu-card-sm flex flex-col gap-1 px-5 py-4">
            <span className={`text-[12px] font-extrabold uppercase tracking-[0.08em] ${muted}`}>{t("sections.median")}</span>
            <span className="font-mono text-[22px] font-semibold">{data.salary ? formatStat(L, data.salary, data.salary.median) : "—"}</span>
            {data.salaryAlt ? <span className={`font-mono text-[13px] font-semibold ${muted}`}>{formatStat(L, data.salaryAlt, data.salaryAlt.median)}</span> : null}
          </div>
          <div className="neu-card-sm flex flex-col gap-1 px-5 py-4">
            <span className={`text-[12px] font-extrabold uppercase tracking-[0.08em] ${muted}`}>{t("sections.remote")}</span>
            <span className="font-mono text-[22px] font-semibold">{data.total ? `${Math.round((data.remote / data.total) * 100)}%` : "—"}</span>
          </div>
          <div className="neu-card-sm flex flex-col gap-1 px-5 py-4">
            <span className={`text-[12px] font-extrabold uppercase tracking-[0.08em] ${muted}`}>{t("sections.grades")}</span>
            <span className="text-[13px] font-semibold leading-snug">
              {(["JUNIOR", "MIDDLE", "SENIOR", "LEAD"] as const)
                .filter((g) => data.grades[g])
                .map((g) => `${L.GRADE_LABEL[g]} ${data.grades[g]}`)
                .join(" · ")}
            </span>
          </div>
        </div>

        <section className="flex flex-col gap-3">
          <h2 className={`m-0 text-[12px] font-extrabold uppercase tracking-[0.08em] ${muted}`}>{t("sections.facets")}</h2>
          <div className="flex flex-wrap items-center gap-2.5">
            {chip(landingPath(data.skill.slug, null), t("sections.allFormats"), !facet)}
            {data.remote >= MIN_JOBS || facet?.kind === "remote" ? chip(landingPath(data.skill.slug, { kind: "remote" }), t("sections.remote"), facet?.kind === "remote") : null}
            {data.cities.map((c) => chip(landingPath(data.skill.slug, { kind: "city", city: c.city, slug: c.slug }), `${c.city} · ${c.count}`, facet?.kind === "city" && facet.city === c.city))}
            {data.salary && data.salary.count >= MIN_SALARIED && !facet ? (
              <Link href={`/salaries/${data.skill.slug}`} className="soft-link text-sm font-semibold">
                {t("sections.salaryLink", { skill: data.skill.name })}
              </Link>
            ) : null}
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3.5">
            <h2 className="m-0 text-xl font-extrabold">{L.formatVacancyCount(result.total)}</h2>
            <div className={`ml-auto flex items-center gap-2.5 text-sm ${muted}`}>
              <nav className="neu-tabs grid grid-cols-2 gap-1" style={{ padding: 4, borderRadius: 12 }}>
                <Link href={base} aria-current={sort === "date" ? "page" : undefined} className="neu-tab inline-flex items-center justify-center px-3 text-sm" style={{ minHeight: 38, borderRadius: 9 }}>
                  {t("sort.date")}
                </Link>
                <Link href={`${base}?sort=salary`} aria-current={sort === "salary" ? "page" : undefined} className="neu-tab inline-flex items-center justify-center px-3 text-sm" style={{ minHeight: 38, borderRadius: 9 }}>
                  {t("sort.salary")}
                </Link>
              </nav>
            </div>
          </div>

          {result.items.length === 0 ? (
            <div className="neu-card px-6 py-10 text-center">
              <p className={`m-0 text-sm ${muted}`}>{t("empty")}</p>
            </div>
          ) : (
            result.items.map((v) => <VacancyCard key={v.id} vacancy={v} now={now} saved={saved.has(v.id)} back={back} from="landing" />)
          )}

          {result.pages > 1 ? (
            <nav aria-label={t("pagination.label")} className="flex flex-wrap items-center gap-2.5 pt-3">
              {pageLinks.map((n, i) => {
                const prev = pageLinks[i - 1];
                const gap = prev !== undefined && n - prev > 1;
                const active = n === result.page;
                const href = `${base}${buildQuery(n)}${sort === "salary" ? (n > 1 ? "&" : "?") + "sort=salary" : ""}`;
                return (
                  <span key={n} className="contents">
                    {gap ? <span className={`px-1 ${muted}`}>…</span> : null}
                    <Link href={href} aria-current={active ? "page" : undefined} className={active ? "neu-primary-sm min-w-11 px-0" : "neu-btn-sm min-w-11 px-0"}>
                      {n}
                    </Link>
                  </span>
                );
              })}
              {result.page < result.pages ? (
                <Link href={`${base}${buildQuery(result.page + 1)}${sort === "salary" ? "&sort=salary" : ""}`} className="neu-btn-sm ml-2">
                  {t("pagination.next")} <ChevronRightIcon />
                </Link>
              ) : null}
            </nav>
          ) : null}
        </section>

        {data.related.length ? (
          <section className="flex flex-col gap-3">
            <h2 className={`m-0 text-[12px] font-extrabold uppercase tracking-[0.08em] ${muted}`}>{t("sections.related")}</h2>
            <div className="flex flex-wrap gap-2.5">
              {data.related.map((r) => (
                <Link key={r.slug} href={`/jobs/${r.slug}`} className="neu-chip">
                  {r.name} · {r.count}
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {data.topCompanies.length ? (
          <section className="flex flex-col gap-3">
            <h2 className={`m-0 text-[12px] font-extrabold uppercase tracking-[0.08em] ${muted}`}>{t("sections.companies")}</h2>
            <div className="flex flex-wrap gap-2.5">
              {data.topCompanies.map((c) => (
                <Link key={c.slug} href={`/companies/${c.slug}`} className="neu-chip">
                  {c.name} · {c.count}
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </main>
      <SiteFooter />
    </>
  );
}
