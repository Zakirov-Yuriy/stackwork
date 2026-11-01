import { useLocale, useTranslations } from "next-intl";
import { Link, getPathname } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import type { Skill } from "@/generated/prisma/client";
import type { VacancyFilters } from "@/lib/vacancies";
import { makeLabels } from "@/lib/labels";
import { Collapsible } from "./mobile-menu";

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
  const t = useTranslations("home.filters");
  const tc = useTranslations("common");
  const locale = useLocale() as Locale;
  const L = makeLabels(locale);
  // Форма ведёт на главную текущего языка (/ или /en)
  const homeAction = getPathname({ href: "/", locale });

  const fmt = new Set(filters.format ?? []);
  const grd = new Set(filters.grade ?? []);
  const emp = new Set(filters.employment ?? []);
  const sk = new Set(filters.skills ?? []);

  const activeCount = fmt.size + grd.size + emp.size + sk.size + (filters.experience ? 1 : 0) + (filters.salaryFrom ? 1 : 0);

  return (
    <aside aria-label={t("title")} className="box-border flex w-full flex-col lg:max-w-[300px] lg:flex-[1_1_260px]">
    <Collapsible title={activeCount ? t("titleCount", { count: activeCount }) : t("title")}>
    <div className="neu-card box-border flex flex-col gap-6 p-6">
      <form method="get" action={homeAction} className="contents">
        {filters.q ? <input type="hidden" name="q" value={filters.q} /> : null}
        {filters.city ? <input type="hidden" name="city" value={filters.city} /> : null}
        {filters.sort === "salary" ? <input type="hidden" name="sort" value="salary" /> : null}

        <div className="flex items-center justify-between gap-3">
          <h2 className="m-0 text-base font-extrabold">{t("title")}</h2>
          <Link href="/" className="soft-link text-[13px]">
            {tc("actions.reset")}
          </Link>
        </div>

        <fieldset className="m-0 flex flex-col gap-0.5 border-0 p-0">
          <legend className={legendCls}>{t("format")}</legend>
          <Check name="format" value="REMOTE" label={L.WORK_FORMAT_LABEL.REMOTE} checked={fmt.has("REMOTE")} count={facets.format.REMOTE} />
          <Check name="format" value="HYBRID" label={L.WORK_FORMAT_LABEL.HYBRID} checked={fmt.has("HYBRID")} count={facets.format.HYBRID} />
          <Check name="format" value="OFFICE" label={L.WORK_FORMAT_LABEL.OFFICE} checked={fmt.has("OFFICE")} count={facets.format.OFFICE} />
        </fieldset>

        <fieldset className="m-0 flex flex-col gap-0.5 border-0 p-0">
          <legend className={legendCls}>{t("grade")}</legend>
          <Check name="grade" value="JUNIOR" label={L.GRADE_LABEL.JUNIOR} checked={grd.has("JUNIOR")} count={facets.grade.JUNIOR} />
          <Check name="grade" value="MIDDLE" label={L.GRADE_LABEL.MIDDLE} checked={grd.has("MIDDLE")} count={facets.grade.MIDDLE} />
          <Check name="grade" value="SENIOR" label={L.GRADE_LABEL.SENIOR} checked={grd.has("SENIOR")} count={facets.grade.SENIOR} />
          <Check name="grade" value="LEAD" label={L.GRADE_LABEL.LEAD} checked={grd.has("LEAD")} count={facets.grade.LEAD} />
        </fieldset>

        <div className="flex flex-col gap-2.5">
          <label htmlFor="salary" className={legendCls.replace("mb-2.5 ", "")}>
            {t("salaryFrom")}
          </label>
          <input
            id="salary"
            name="salary"
            type="text"
            inputMode="numeric"
            placeholder={t("salaryPlaceholder")}
            defaultValue={filters.salaryFrom ? L.nf.format(filters.salaryFrom) : ""}
            className="neu-field font-mono text-sm"
            style={{ minHeight: 46 }}
          />
        </div>

        <fieldset className="m-0 flex flex-col gap-0.5 border-0 p-0">
          <legend className={legendCls}>{t("experience")}</legend>
          <Check type="radio" name="exp" value="" label={t("anyExperience")} checked={!filters.experience} />
          <Check type="radio" name="exp" value="NONE" label={L.EXPERIENCE_LABEL.NONE} checked={filters.experience === "NONE"} />
          <Check type="radio" name="exp" value="ONE_TO_THREE" label={L.EXPERIENCE_LABEL.ONE_TO_THREE} checked={filters.experience === "ONE_TO_THREE"} />
          <Check type="radio" name="exp" value="THREE_TO_SIX" label={L.EXPERIENCE_LABEL.THREE_TO_SIX} checked={filters.experience === "THREE_TO_SIX"} />
          <Check type="radio" name="exp" value="SIX_PLUS" label={L.EXPERIENCE_LABEL.SIX_PLUS} checked={filters.experience === "SIX_PLUS"} />
        </fieldset>

        {skills.length ? (
          <fieldset className="m-0 flex flex-col gap-3 border-0 p-0">
            <legend className={legendCls.replace("mb-2.5 ", "")}>{t("stack")}</legend>
            <div className="flex flex-wrap gap-2.5 py-1">
              {skills.map((s) => (
                <label key={s.id} className="neu-pill font-mono">
                  <input type="checkbox" name="skills" value={s.slug} defaultChecked={sk.has(s.slug)} />
                  <span>{s.name}</span>
                </label>
              ))}
            </div>
          </fieldset>
        ) : null}

        <fieldset className="m-0 flex flex-col gap-0.5 border-0 p-0">
          <legend className={legendCls}>{t("employment")}</legend>
          <Check name="employment" value="FULL_TIME" label={t("employmentFull")} checked={emp.has("FULL_TIME")} />
          <Check name="employment" value="PART_TIME" label={t("employmentPart")} checked={emp.has("PART_TIME")} />
          <Check name="employment" value="CONTRACT" label={t("employmentContract")} checked={emp.has("CONTRACT")} />
        </fieldset>

        <button type="submit" className="neu-primary" style={{ minHeight: 52, fontSize: 15 }}>
          {t("show", { count: L.formatVacancyCount(total) })}
        </button>
      </form>
    </div>
    </Collapsible>
    </aside>
  );
}
