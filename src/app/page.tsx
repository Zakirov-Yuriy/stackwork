import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { VacancyCard } from "@/components/vacancy-card";
import { FiltersSidebar } from "@/components/filters-sidebar";
import { SearchIcon, PinIcon, ChevronRightIcon } from "@/components/icons";
import { searchVacancies, facetCounts, popularSkills, parseFilters } from "@/lib/vacancies";
import { formatVacancyCount, GRADE_LABEL, WORK_FORMAT_SHORT, EXPERIENCE_LABEL } from "@/lib/labels";

const POPULAR_CHIPS = [
  { label: "Python", href: "/?skills=python" },
  { label: "Go", href: "/?skills=go" },
  { label: "TypeScript", href: "/?skills=typescript" },
  { label: "React", href: "/?skills=react" },
  { label: "DevOps", href: "/?q=DevOps" },
  { label: "Data", href: "/?q=Data" },
  { label: "QA", href: "/?q=QA" },
  { label: "Удалённо", href: "/?format=REMOTE" },
];

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

export default async function HomePage(props: PageProps<"/">) {
  const raw = await props.searchParams;
  const filters = parseFilters(raw);
  const now = new Date();

  const [result, facets, skills] = await Promise.all([
    searchVacancies(filters),
    facetCounts(),
    popularSkills(9),
  ]);

  const summary = [
    ...(filters.skills ?? []).map((s) => skills.find((x) => x.slug === s)?.name ?? s),
    ...(filters.format ?? []).map((f) => WORK_FORMAT_SHORT[f]),
    ...(filters.grade ?? []).map((g) => GRADE_LABEL[g]),
    ...(filters.experience ? [EXPERIENCE_LABEL[filters.experience]] : []),
    ...(filters.q ? [`«${filters.q}»`] : []),
    ...(filters.city ? [filters.city] : []),
  ];

  const pageLinks = Array.from({ length: result.pages }, (_, i) => i + 1).filter(
    (n) => n <= 4 || n === result.pages || Math.abs(n - result.page) <= 1,
  );

  return (
    <>
      <SiteHeader />

      <section className="border-b border-line bg-card">
        <div className="mx-auto flex max-w-[1180px] flex-col gap-6 px-6 pb-9 pt-12">
          <div className="flex max-w-[760px] flex-col gap-2.5">
            <h1 className="text-[40px] font-extrabold leading-[1.1] tracking-tight">Вакансии только для IT</h1>
            <p className="text-[17px] leading-relaxed text-muted">
              Разработка, DevOps, данные, QA, аналитика. Зарплата и стек видны в каждой карточке, фильтры по грейду и
              формату работы.
            </p>
          </div>

          <form method="get" action="/" className="flex flex-wrap gap-3">
            <div className="box-border flex min-h-[52px] flex-[3_1_320px] items-center gap-2.5 rounded-[10px] border-[1.5px] border-ink bg-card px-3.5">
              <SearchIcon />
              <label htmlFor="q" className="sr-only">
                Должность, стек или компания
              </label>
              <input
                id="q"
                name="q"
                type="text"
                defaultValue={filters.q ?? ""}
                placeholder="Должность, стек или компания"
                className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-2"
              />
            </div>
            <div className="box-border flex min-h-[52px] flex-[2_1_220px] items-center gap-2.5 rounded-[10px] border-[1.5px] border-line-2 bg-card px-3.5 focus-within:border-ink">
              <PinIcon stroke="var(--muted)" />
              <label htmlFor="city" className="sr-only">
                Город или удалённо
              </label>
              <input
                id="city"
                name="city"
                type="text"
                defaultValue={filters.city ?? ""}
                placeholder="Город или «удалённо»"
                className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-2"
              />
            </div>
            <button
              type="submit"
              className="min-h-[52px] flex-none rounded-[10px] bg-accent px-7 text-base font-extrabold text-ink hover:brightness-95"
            >
              Найти
            </button>
          </form>

          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-[13px] font-semibold text-muted">Популярное:</span>
            {POPULAR_CHIPS.map((c) => (
              <Link
                key={c.label}
                href={c.href}
                className="inline-flex min-h-9 items-center rounded-full border border-line bg-paper px-3 font-mono text-[13px] text-ink hover:border-ink"
              >
                {c.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <main className="mx-auto box-border flex w-full max-w-[1180px] flex-wrap items-start gap-6 px-6 pb-12 pt-7">
        <FiltersSidebar filters={filters} facets={facets} skills={skills} total={result.total} />

        <section className="flex min-w-0 flex-[999_1_560px] flex-col gap-3.5">
          <div className="flex flex-wrap items-center gap-3.5">
            <h2 className="text-xl font-extrabold">{formatVacancyCount(result.total)}</h2>
            {summary.length ? <span className="text-sm text-muted">{summary.join(" · ")}</span> : null}
            <div className="ml-auto flex items-center gap-2 text-sm text-muted">
              <span>Сортировка</span>
              <div className="flex overflow-hidden rounded-lg border border-line-2 bg-card">
                <Link
                  href={buildQuery(raw, { sort: undefined, page: undefined })}
                  aria-current={filters.sort === "date" ? "true" : undefined}
                  className={`inline-flex min-h-11 items-center px-3 text-sm font-bold ${filters.sort === "date" ? "bg-ink text-white" : "text-ink hover:bg-soft"}`}
                >
                  По дате
                </Link>
                <Link
                  href={buildQuery(raw, { sort: "salary", page: undefined })}
                  aria-current={filters.sort === "salary" ? "true" : undefined}
                  className={`inline-flex min-h-11 items-center px-3 text-sm font-bold ${filters.sort === "salary" ? "bg-ink text-white" : "text-ink hover:bg-soft"}`}
                >
                  По зарплате
                </Link>
              </div>
            </div>
          </div>

          {result.items.length === 0 ? (
            <div className="rounded-xl border border-line bg-card px-6 py-10 text-center">
              <p className="text-lg font-extrabold">Ничего не нашлось</p>
              <p className="mt-1 text-sm text-muted">Попробуйте убрать часть фильтров или изменить запрос.</p>
              <Link href="/" className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-ink px-4 text-sm font-bold text-white">
                Сбросить фильтры
              </Link>
            </div>
          ) : (
            result.items.map((v) => <VacancyCard key={v.id} vacancy={v} now={now} />)
          )}

          {result.pages > 1 ? (
            <nav aria-label="Страницы" className="flex flex-wrap items-center gap-1.5 pt-2">
              {pageLinks.map((n, i) => {
                const prev = pageLinks[i - 1];
                const gap = prev !== undefined && n - prev > 1;
                const active = n === result.page;
                return (
                  <span key={n} className="contents">
                    {gap ? <span className="px-1 text-muted-2">…</span> : null}
                    <Link
                      href={buildQuery(raw, { page: n === 1 ? undefined : String(n) })}
                      aria-current={active ? "page" : undefined}
                      className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-sm font-bold ${active ? "bg-ink text-white" : "text-ink hover:bg-line"}`}
                    >
                      {n}
                    </Link>
                  </span>
                );
              })}
              {result.page < result.pages ? (
                <Link
                  href={buildQuery(raw, { page: String(result.page + 1) })}
                  className="ml-2 inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-line-2 px-3.5 text-sm font-bold text-ink hover:bg-line"
                >
                  Дальше <ChevronRightIcon />
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
