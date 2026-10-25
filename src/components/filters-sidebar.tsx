import Link from "next/link";
import type { Skill } from "@/generated/prisma/client";
import type { VacancyFilters } from "@/lib/vacancies";
import { formatVacancyCount } from "@/lib/labels";

type Facets = {
  format: { REMOTE: number; HYBRID: number; OFFICE: number };
  grade: { JUNIOR: number; MIDDLE: number; SENIOR: number; LEAD: number };
};

const legendCls = "mb-2.5 text-[12px] font-extrabold uppercase tracking-[0.08em] text-[color:var(--soft-muted)]";
const rowCls = "flex min-h-11 cursor-pointer items-center gap-3 text-sm font-semibold text-[color:var(--soft-text)]";
const countCls = "ml-auto text-xs font-semibold text-[color:var(--soft-muted)]";

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
      <input type={type} name={name} value={value} defaultChecked={checked} className={`neu-check ${type === "radio" ? "rounded-full before:rounded-full" : ""}`} />
      <span>{label}</span>
      {count !== undefined ? <span className={countCls}>{count}</span> : null}
    </label>
  );
}

export function FiltersSidebar({ filters, facets, skills, total }: { filters: VacancyFilters; facets: Facets; skills: Skill[]; total: number }) {
  const fmt = new Set(filters.format ?? []);
  const grd = new Set(filters.grade ?? []);
  const emp = new Set(filters.employment ?? []);
  const sk = new Set(filters.skills ?? []);

  return (
    <aside aria-label="Фильтры" className="neu-card box-border flex max-w-[300px] flex-[1_1_260px] flex-col gap-6 p-6">
      <form method="get" action="/" className="contents">
        {filters.q ? <input type="hidden" name="q" value={filters.q} /> : null}
        {filters.city ? <input type="hidden" name="city" value={filters.city} /> : null}
        {filters.sort === "salary" ? <input type="hidden" name="sort" value="salary" /> : null}

        <div className="flex items-center justify-between gap-3">
          <h2 className="m-0 text-base font-extrabold">Фильтры</h2>
          <Link href="/" className="soft-link text-[13px]">
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

        <div className="flex flex-col gap-2.5">
          <label htmlFor="salary" className={legendCls.replace("mb-2.5 ", "")}>
            Зарплата от
          </label>
          <input
            id="salary"
            name="salary"
            type="text"
            inputMode="numeric"
            placeholder="150 000"
            defaultValue={filters.salaryFrom ? filters.salaryFrom.toLocaleString("ru-RU") : ""}
            className="neu-field font-mono text-sm"
            style={{ minHeight: 46 }}
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
          <fieldset className="m-0 flex flex-col gap-3 border-0 p-0">
            <legend className={legendCls.replace("mb-2.5 ", "")}>Стек</legend>
            <div className="flex flex-wrap gap-2.5 py-1">
              {skills.map((s) => (
                <label key={s.id} className="neu-pill">
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

        <button type="submit" className="neu-primary" style={{ minHeight: 52, fontSize: 15 }}>
          Показать {formatVacancyCount(total)}
        </button>
      </form>
    </aside>
  );
}
