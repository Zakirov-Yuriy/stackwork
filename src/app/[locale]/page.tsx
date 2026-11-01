import type { Metadata } from "next";
import { getTranslations, getLocale } from "next-intl/server";
import { Link, getPathname } from "@/i18n/navigation";
import { languageAlternates } from "@/i18n/seo";
import type { Locale } from "@/i18n/routing";
import { SiteHeader } from "@/components/site-header";
import { JsonLd } from "@/components/json-ld";
import { websiteJsonLd } from "@/lib/seo/job-posting";
import { SiteFooter } from "@/components/site-footer";
import { VacancyCard } from "@/components/vacancy-card";
import { FiltersSidebar } from "@/components/filters-sidebar";
import { SearchIcon, PinIcon, ChevronRightIcon } from "@/components/icons";
import { searchVacancies, facetCounts, popularSkills, parseFilters } from "@/lib/vacancies";
import { savedIdsFor } from "@/lib/saved";
import { getCurrentUser } from "@/lib/session";
import { makeLabels } from "@/lib/labels";

export async function generateMetadata(): Promise<Metadata> {
  return { alternates: languageAlternates("/") };
}

function buildQuery(base: Record<string, string | string[] | undefined>, patch: Record<string, string | undefined>) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...base, ...patch })) {
    if (v === undefined || v === "") continue;
    if (Array.isArray(v)) v.forEach((x) => p.append(k, x));
    else p.set(k, v);
  }
  const s = p.toString();
  return s ? `/?${s}` : "/";
}

export default async function HomePage(props: PageProps<"/[locale]">) {
  const raw = await props.searchParams;
  const filters = parseFilters(raw);
  const now = new Date();

  const [t, tc, locale, user] = await Promise.all([getTranslations("home"), getTranslations("common"), getLocale(), getCurrentUser()]);
  const L = makeLabels(locale as Locale);
  // Форма поиска должна вести на главную текущего языка (/ или /en)
  const homeAction = getPathname({ href: "/", locale });
  const [result, facets, skills] = await Promise.all([searchVacancies(filters), facetCounts(), popularSkills(9)]);
  const saved = await savedIdsFor(user?.id, result.items.map((v) => v.id));
  const back = buildQuery(raw, {});

  const popularChips = [
    { label: "Python", href: "/?skills=python" },
    { label: "Go", href: "/?skills=go" },
    { label: "TypeScript", href: "/?skills=typescript" },
    { label: "React", href: "/?skills=react" },
    { label: "DevOps", href: "/?q=DevOps" },
    { label: "Data", href: "/?q=Data" },
    { label: "QA", href: "/?q=QA" },
    { label: L.WORK_FORMAT_SHORT.REMOTE, href: "/?format=REMOTE" },
  ];

  const summary = [
    ...(filters.skills ?? []).map((s) => skills.find((x) => x.slug === s)?.name ?? s),
    ...(filters.format ?? []).map((f) => L.WORK_FORMAT_SHORT[f]),
    ...(filters.grade ?? []).map((g) => L.GRADE_LABEL[g]),
    ...(filters.experience ? [L.EXPERIENCE_LABEL[filters.experience]] : []),
    ...(filters.q ? [t("summary.query", { q: filters.q })] : []),
    ...(filters.city ? [filters.city] : []),
  ];

  const pageLinks = Array.from({ length: result.pages }, (_, i) => i + 1).filter((n) => n <= 4 || n === result.pages || Math.abs(n - result.page) <= 1);

  return (
    <>
      <SiteHeader />
      <JsonLd data={websiteJsonLd()} />

      <section>
        <div className="mx-auto flex max-w-[1180px] flex-col gap-7 px-6 pb-10 pt-10">
          <div className="flex max-w-[760px] flex-col gap-3">
            <h1 className="m-0 text-[40px] font-extrabold leading-[1.1] tracking-tight text-[color:var(--soft-text)]">{t("hero.title")}</h1>
            <p className="m-0 text-[17px] leading-relaxed text-[color:var(--soft-muted)]">{t("hero.text")}</p>
          </div>

          <form method="get" action={homeAction} className="flex flex-wrap gap-4">
            <div className="neu-search flex-[3_1_320px]">
              <SearchIcon stroke="var(--soft-muted)" />
              <label htmlFor="q" className="sr-only">
                {t("search.query")}
              </label>
              <input id="q" name="q" type="text" defaultValue={filters.q ?? ""} placeholder={t("search.query")} />
            </div>
            <div className="neu-search flex-[2_1_220px]">
              <PinIcon stroke="var(--soft-muted)" />
              <label htmlFor="city" className="sr-only">
                {t("search.cityLabel")}
              </label>
              <input id="city" name="city" type="text" defaultValue={filters.city ?? ""} placeholder={t("search.cityPlaceholder")} />
            </div>
            <button type="submit" className="neu-primary flex-none px-8">
              {tc("actions.search")}
            </button>
          </form>

          <div className="flex flex-wrap items-center gap-3">
            <span className="mr-1 text-[13px] font-semibold text-[color:var(--soft-muted)]">{t("popular")}</span>
            {popularChips.map((c) => (
              <Link key={c.label} href={c.href} className="neu-pill font-mono">
                {c.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <main className="mx-auto box-border flex w-full max-w-[1180px] flex-wrap items-start gap-7 px-6 pb-14 pt-2">
        <FiltersSidebar filters={filters} facets={facets} skills={skills} total={result.total} />

        <section className="flex min-w-0 flex-[999_1_560px] flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3.5">
            <h2 className="m-0 text-xl font-extrabold">{L.formatVacancyCount(result.total)}</h2>
            {summary.length ? <span className="text-sm text-[color:var(--soft-muted)]">{summary.join(" · ")}</span> : null}
            <div className="ml-auto flex items-center gap-2.5 text-sm text-[color:var(--soft-muted)]">
              <span>{t("sort.label")}</span>
              <nav className="neu-tabs grid grid-cols-2 gap-1" style={{ padding: 4, borderRadius: 12 }}>
                <Link href={buildQuery(raw, { sort: undefined, page: undefined })} aria-current={filters.sort === "date" ? "page" : undefined} className="neu-tab inline-flex items-center justify-center px-3 text-sm" style={{ minHeight: 38, borderRadius: 9 }}>
                  {t("sort.date")}
                </Link>
                <Link href={buildQuery(raw, { sort: "salary", page: undefined })} aria-current={filters.sort === "salary" ? "page" : undefined} className="neu-tab inline-flex items-center justify-center px-3 text-sm" style={{ minHeight: 38, borderRadius: 9 }}>
                  {t("sort.salary")}
                </Link>
              </nav>
            </div>
          </div>

          {result.items.length === 0 ? (
            <div className="neu-card px-6 py-10 text-center">
              <p className="m-0 text-lg font-extrabold">{t("empty.title")}</p>
              <p className="m-0 mt-1 text-sm text-[color:var(--soft-muted)]">{t("empty.text")}</p>
              <Link href="/" className="neu-primary-sm mt-5">
                {t("empty.reset")}
              </Link>
            </div>
          ) : (
            result.items.map((v) => <VacancyCard key={v.id} vacancy={v} now={now} saved={saved.has(v.id)} back={back} />)
          )}

          {result.pages > 1 ? (
            <nav aria-label={t("pagination.label")} className="flex flex-wrap items-center gap-2.5 pt-3">
              {pageLinks.map((n, i) => {
                const prev = pageLinks[i - 1];
                const gap = prev !== undefined && n - prev > 1;
                const active = n === result.page;
                return (
                  <span key={n} className="contents">
                    {gap ? <span className="px-1 text-[color:var(--soft-muted)]">…</span> : null}
                    <Link href={buildQuery(raw, { page: n === 1 ? undefined : String(n) })} aria-current={active ? "page" : undefined} className={active ? "neu-primary-sm min-w-11 px-0" : "neu-btn-sm min-w-11 px-0"}>
                      {n}
                    </Link>
                  </span>
                );
              })}
              {result.page < result.pages ? (
                <Link href={buildQuery(raw, { page: String(result.page + 1) })} className="neu-btn-sm ml-2">
                  {t("pagination.next")} <ChevronRightIcon />
                </Link>
              ) : null}
            </nav>
          ) : null}
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
