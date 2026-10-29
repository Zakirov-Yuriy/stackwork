import Link from "next/link";
import type { Skill } from "@/generated/prisma/client";
import type { VacancyFilters } from "@/lib/vacancies";
import { formatVacancyCount } from "@/lib/labels";

type Facets = {
  format: { REMOTE: number; HYBRID: number; OFFICE: number };
  grade: { JUNIOR: number; MIDDLE: number; SENIOR: number; LEAD: number };
};

const legendCls = "mb-2 text-[13px] font-bold uppercase tracking-[0.06em] text-muted";
const rowCls = "flex min-h-11 cursor-pointer items-center gap-2.5 text-sm font-semibold";
const boxCls = "m-0 h-[18px] w-[18px] accent-ink";
const countCls = "ml-auto text-xs font-medium text-muted-2";

function Check({
  name,
  value,
  label,
  checked,
  count,
  type = "checkbox",
}: {
  name: string;
  value: string;
  label: string;
  checked: boolean;
  count?: number;
  type?: "checkbox" | "radio";
}) {
  return (
    <label className={rowCls}>
      <input type={type} name={name} value={value} defaultChecked={checked} className={boxCls} />
      <span>{label}</span>
      {count !== undefined ? <span className={countCls}>{count}</span> : null}
    </label>
  );
}

export function FiltersSidebar({
  filters,
  facets,
  skills,
  total,
}: {
  filters: VacancyFilters;
  facets: Facets;
  skills: Skill[];
  total: number;
}) {
  const fmt = new Set(filters.format ?? []);
  const grd = new Set(filters.grade ?? []);
  const emp = new Set(filters.employment ?? []);
  const sk = new Set(filters.skills ?? []);

  return (
    <aside
      aria-label="Фильтры"
      className="box-border flex max-w-[300px] flex-[1_1_260px] flex-col gap-[22px] rounded-xl border border-line bg-card p-5"
    >
      <form method="get" action="/" className="contents">
        {/* Сохраняем поисковый запрос и город при изменении фильтров */}
        {filters.q ? <input type="hidden" name="q" value={filters.q} /> : null}
        {filters.city ? <input type="hidden" name="city" value={filters.city} /> : null}
        {filters.sort === "salary" ? <input type="hidden" name="sort" value="salary" /> : null}

        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-extrabold">Фильтры</h2>
          <Link href="/" className="text-[13px] font-semibold text-link hover:text-ink">
            Сбросить
          </Link>
        </div>

        <fieldset className="m-0 flex flex-col gap-0.5 border-0 p-0">
          <legend className={legendCls}>Формат работы</legend>
          <Check name="format" value="REMOTE" label="Удалённо" checked={fmt.has("REMOTE")} count={facets.format.REMOTE} />
          <Check name="format" value="HYBRID" label="Гибрид" checked={fmt.has("HYBRID")} count={facets.format.HYBRID} />
          <Check name="format" value="OFFICE" label="Офис" checked={fmt.has("OFFICE")} count={facets.format.OFFICE} />
        </fieldset>

        <fieldset className="m-0 flex flex-col gap-0.5 border-0 p-0">
          <legend className={legendCls}>Грейд</legend>
          <Check name="grade" value="JUNIOR" label="Junior" checked={grd.has("JUNIOR")} count={facets.grade.JUNIOR} />
          <Check name="grade" value="MIDDLE" label="Middle" checked={grd.has("MIDDLE")} count={facets.grade.MIDDLE} />
          <Check name="grade" value="SENIOR" label="Senior" checked={grd.has("SENIOR")} count={facets.grade.SENIOR} />
          <Check name="grade" value="LEAD" label="Lead" checked={grd.has("LEAD")} count={facets.grade.LEAD} />
        </fieldset>

        <div className="flex flex-col gap-2">
          <label htmlFor="salary" className={legendCls.replace("mb-2 ", "")}>
            Зарплата от
          </label>
          <input
            id="salary"
            name="salary"
            type="text"
            inputMode="numeric"
            placeholder="150 000"
            defaultValue={filters.salaryFrom ? filters.salaryFrom.toLocaleString("ru-RU") : ""}
            className="box-border min-h-11 w-full rounded-lg border border-line-2 bg-card px-3 font-mono text-sm outline-none focus:border-ink"
          />
        </div>

        <fieldset className="m-0 flex flex-col gap-0.5 border-0 p-0">
          <legend className={legendCls}>Опыт</legend>
          <Check type="radio" name="exp" value="" label="Любой" checked={!filters.experience} />
          <Check type="radio" name="exp" value="NONE" label="Без опыта" checked={filters.experience === "NONE"} />
          <Check type="radio" name="exp" value="ONE_TO_THREE" label="1 до 3 лет" checked={filters.experience === "ONE_TO_THREE"} />
          <Check type="radio" name="exp" value="THREE_TO_SIX" label="3 до 6 лет" checked={filters.experience === "THREE_TO_SIX"} />
          <Check type="radio" name="exp" value="SIX_PLUS" label="Больше 6 лет" checked={filters.experience === "SIX_PLUS"} />
        </fieldset>

        {skills.length ? (
          <fieldset className="m-0 flex flex-col gap-2.5 border-0 p-0">
            <legend className={legendCls.replace("mb-2 ", "")}>Стек</legend>
            <div className="flex flex-wrap gap-2">
              {skills.map((s) => (
                <label
                  key={s.id}
                  className="tag-pill relative inline-flex min-h-9 cursor-pointer items-center rounded-full border border-line-2 px-3 font-mono text-[13px]"
                >
                  <input type="checkbox" name="skills" value={s.slug} defaultChecked={sk.has(s.slug)} />
                  <span>{s.name}</span>
                </label>
              ))}
            </div>
          </fieldset>
        ) : null}

        <fieldset className="m-0 flex flex-col gap-0.5 border-0 p-0">
          <legend className={legendCls}>Занятость</legend>
          <Check name="employment" value="FULL_TIME" label="Полная" checked={emp.has("FULL_TIME")} />
          <Check name="employment" value="PART_TIME" label="Частичная" checked={emp.has("PART_TIME")} />
          <Check name="employment" value="CONTRACT" label="Проект или контракт" checked={emp.has("CONTRACT")} />
        </fieldset>

        <button
          type="submit"
          className="min-h-12 rounded-[10px] bg-accent text-[15px] font-extrabold text-ink hover:brightness-95"
        >
          Показать {formatVacancyCount(total)}
        </button>
      </form>
    </aside>
  );
}
