"use client";

import { useActionState, useMemo, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { saveVacancyAction, type VacancyActionState } from "../actions";
import { Field, ErrorBanner, SuccessBanner, Pill, fieldCls, textareaCls, primaryBtn, secondaryBtn, hintCls } from "@/components/form";
import { DIRECTIONS, DIRECTION_KEY, CURRENCIES, parseSkills, moderationChecks, type VacancyInput } from "@/lib/vacancy-form";
import { makeLabels } from "@/lib/labels";

type Props = {
  id?: string;
  initial: VacancyInput;
  companyName: string;
  status?: string;
  saved?: boolean;
};

const sectionCls = "neu-card flex flex-col gap-[18px] p-7";
const h2Cls = "m-0 text-[17px] font-extrabold";

export function VacancyForm({ id, initial, companyName, status, saved }: Props) {
  const [state, action, pending] = useActionState<VacancyActionState, FormData>(saveVacancyAction, undefined);
  const t = useTranslations("employer");
  const tf = useTranslations("employer.vacancyForm.fields");
  const tChecks = useTranslations("employer.vacancyForm.checks");
  const L = makeLabels(useLocale());

  // Живое превью и чек-лист: только те поля, что видны в карточке
  const [title, setTitle] = useState(initial.title);
  const [grade, setGrade] = useState(initial.grade);
  const [workFormat, setWorkFormat] = useState(initial.workFormat);
  const [city, setCity] = useState(initial.city ?? "");
  const [salaryFrom, setSalaryFrom] = useState(initial.salaryFrom ? String(initial.salaryFrom) : "");
  const [salaryTo, setSalaryTo] = useState(initial.salaryTo ? String(initial.salaryTo) : "");
  const [currency, setCurrency] = useState(initial.currency);
  const [skillsRaw, setSkillsRaw] = useState(initial.skills.join(", "));
  const [responsibilities, setResponsibilities] = useState(initial.responsibilities ?? "");
  const [requirements, setRequirements] = useState(initial.requirements ?? "");
  const [aboutTeam, setAboutTeam] = useState(initial.aboutTeam ?? "");
  const [conditions, setConditions] = useState(initial.conditions ?? "");

  const skills = useMemo(() => parseSkills(skillsRaw), [skillsRaw]);
  const preview: VacancyInput = {
    ...initial,
    title,
    grade,
    workFormat,
    city: city || null,
    salaryFrom: toNum(salaryFrom),
    salaryTo: toNum(salaryTo),
    currency,
    skills,
    responsibilities: responsibilities || null,
    requirements: requirements || null,
    aboutTeam: aboutTeam || null,
    conditions: conditions || null,
  };
  const checks = moderationChecks(preview, tChecks);
  const allOk = checks.every((c) => c.ok);

  return (
    <form action={action} className="flex flex-wrap items-start gap-6">
      {id ? <input type="hidden" name="id" value={id} /> : null}

      <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-5">
        <ErrorBanner message={state?.error} />
        <SuccessBanner message={saved ? t("vacancyForm.draftSaved") : state?.success} />

        <section className={sectionCls}>
          <h2 className={h2Cls}>{t("vacancyForm.sections.basic")}</h2>
          <Field label={tf("title")} htmlFor="title" hint={tf("titleHint")}>
            <input id="title" name="title" type="text" required value={title} onChange={(e) => setTitle(e.target.value)} className={fieldCls} />
          </Field>
          <div className="flex flex-wrap gap-4">
            <Field label={tf("direction")} htmlFor="direction" className="flex-[1_1_240px]">
              <select id="direction" name="direction" defaultValue={initial.direction} className={fieldCls}>
                {DIRECTIONS.map((d) => (
                  <option key={d} value={d}>
                    {t(`vacancyForm.directions.${DIRECTION_KEY[d]}`)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={tf("experience")} htmlFor="experience" className="flex-[1_1_240px]">
              <select id="experience" name="experience" defaultValue={initial.experience} className={fieldCls}>
                <option value="NONE">{L.EXPERIENCE_LABEL.NONE}</option>
                <option value="ONE_TO_THREE">{L.EXPERIENCE_LABEL.ONE_TO_THREE}</option>
                <option value="THREE_TO_SIX">{L.EXPERIENCE_LABEL.THREE_TO_SIX}</option>
                <option value="SIX_PLUS">{L.EXPERIENCE_LABEL.SIX_PLUS}</option>
              </select>
            </Field>
          </div>
          <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
            <legend className="mb-0.5 text-sm font-bold">{tf("grade")}</legend>
            <div className="flex flex-wrap gap-2" onChange={(e) => setGrade((e.target as HTMLInputElement).value as VacancyInput["grade"])}>
              {(["JUNIOR", "MIDDLE", "SENIOR", "LEAD"] as const).map((g) => (
                <Pill key={g} name="grade" value={g} label={L.GRADE_LABEL[g]} defaultChecked={initial.grade === g} />
              ))}
            </div>
          </fieldset>
        </section>

        <section className={sectionCls}>
          <h2 className={h2Cls}>{t("vacancyForm.sections.format")}</h2>
          <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
            <legend className="mb-0.5 text-sm font-bold">{tf("workFormat")}</legend>
            <div className="flex flex-wrap gap-2" onChange={(e) => setWorkFormat((e.target as HTMLInputElement).value as VacancyInput["workFormat"])}>
              <Pill name="workFormat" value="REMOTE_OR_OFFICE" label={L.WORK_FORMAT_LABEL.REMOTE_OR_OFFICE} defaultChecked={initial.workFormat === "REMOTE_OR_OFFICE"} />
              <Pill name="workFormat" value="REMOTE" label={tf("remoteOnly")} defaultChecked={initial.workFormat === "REMOTE"} />
              <Pill name="workFormat" value="HYBRID" label={L.WORK_FORMAT_LABEL.HYBRID} defaultChecked={initial.workFormat === "HYBRID"} />
              <Pill name="workFormat" value="OFFICE" label={L.WORK_FORMAT_LABEL.OFFICE} defaultChecked={initial.workFormat === "OFFICE"} />
            </div>
          </fieldset>
          <div className="flex flex-wrap gap-4">
            <Field label={tf("city")} htmlFor="city" className="flex-[1_1_240px]">
              <input id="city" name="city" type="text" value={city} onChange={(e) => setCity(e.target.value)} className={fieldCls} />
            </Field>
            <Field label={tf("employment")} htmlFor="employment" className="flex-[1_1_240px]">
              <select id="employment" name="employment" defaultValue={initial.employment} className={fieldCls}>
                <option value="FULL_TIME">{L.EMPLOYMENT_LABEL.FULL_TIME}</option>
                <option value="PART_TIME">{L.EMPLOYMENT_LABEL.PART_TIME}</option>
                <option value="CONTRACT">{L.EMPLOYMENT_LABEL.CONTRACT}</option>
              </select>
            </Field>
          </div>
        </section>

        <section className={sectionCls}>
          <div className="flex flex-col gap-1">
            <h2 className={h2Cls}>{t("vacancyForm.sections.salary")}</h2>
            <p className="m-0 text-[13px] text-[color:var(--soft-muted)]">{tf("salaryNote")}</p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <Field label={tf("salaryFrom")} htmlFor="salaryFrom" className="flex-[1_1_140px]">
              <input
                id="salaryFrom"
                name="salaryFrom"
                type="text"
                inputMode="numeric"
                value={salaryFrom}
                onChange={(e) => setSalaryFrom(e.target.value)}
                className={`${fieldCls} font-mono`}
              />
            </Field>
            <Field label={tf("salaryTo")} htmlFor="salaryTo" className="flex-[1_1_140px]">
              <input
                id="salaryTo"
                name="salaryTo"
                type="text"
                inputMode="numeric"
                value={salaryTo}
                onChange={(e) => setSalaryTo(e.target.value)}
                className={`${fieldCls} font-mono`}
              />
            </Field>
            <Field label={tf("currency")} htmlFor="currency" className="flex-[0_1_110px]">
              <select id="currency" name="currency" value={currency} onChange={(e) => setCurrency(e.target.value)} className={fieldCls}>
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c === "RUB" ? "₽" : c === "USD" ? "$" : "€"}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={tf("salaryType")} htmlFor="salaryType" className="flex-[1_1_160px]">
              <select id="salaryType" name="salaryType" defaultValue={initial.salaryType} className={fieldCls}>
                <option value="NET">{tf("salaryNet")}</option>
                <option value="GROSS">{tf("salaryGross")}</option>
              </select>
            </Field>
          </div>
        </section>

        <section className={sectionCls}>
          <h2 className={h2Cls}>{t("vacancyForm.sections.stack")}</h2>
          {skills.length ? (
            <div className="flex flex-wrap gap-2">
              {skills.map((s) => (
                <span key={s} className="neu-chip inline-flex min-h-9 items-center text-[13px]">
                  {s}
                </span>
              ))}
            </div>
          ) : null}
          <Field label={tf("skills")} htmlFor="skills" hint={tf("skillsHint")}>
            <input
              id="skills"
              name="skills"
              type="text"
              value={skillsRaw}
              onChange={(e) => setSkillsRaw(e.target.value)}
              placeholder={tf("skillsPlaceholder")}
              className={`${fieldCls} font-mono text-sm`}
            />
          </Field>
        </section>

        <section className={sectionCls}>
          <h2 className={h2Cls}>{t("vacancyForm.sections.description")}</h2>
          <Field label={tf("aboutTeam")} htmlFor="aboutTeam">
            <textarea id="aboutTeam" name="aboutTeam" rows={4} value={aboutTeam} onChange={(e) => setAboutTeam(e.target.value)} className={textareaCls} />
          </Field>
          <Field label={tf("responsibilities")} htmlFor="responsibilities" hint={tf("responsibilitiesHint")}>
            <textarea
              id="responsibilities"
              name="responsibilities"
              rows={4}
              value={responsibilities}
              onChange={(e) => setResponsibilities(e.target.value)}
              className={textareaCls}
            />
          </Field>
          <Field label={tf("requirements")} htmlFor="requirements" hint={tf("requirementsHint")}>
            <textarea id="requirements" name="requirements" rows={4} value={requirements} onChange={(e) => setRequirements(e.target.value)} className={textareaCls} />
          </Field>
          <Field label={tf("niceToHave")} htmlFor="niceToHave">
            <textarea id="niceToHave" name="niceToHave" rows={3} defaultValue={initial.niceToHave ?? ""} className={textareaCls} />
          </Field>
          <Field label={tf("conditions")} htmlFor="conditions" hint={tf("conditionsHint")}>
            <textarea id="conditions" name="conditions" rows={3} value={conditions} onChange={(e) => setConditions(e.target.value)} className={textareaCls} />
          </Field>
        </section>

        <section className={sectionCls}>
          <h2 className={h2Cls}>{t("responses.title")}</h2>
          <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-sm font-semibold">
            <input type="checkbox" name="acceptsGithubLink" defaultChecked={initial.acceptsGithubLink} className="neu-check" />
            <span>{tf("acceptsGithubLink")}</span>
          </label>
          <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-sm font-semibold">
            <input type="checkbox" name="showCompanyName" defaultChecked={initial.showCompanyName} className="neu-check" />
            <span>{tf("showCompanyName")}</span>
          </label>
        </section>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button type="submit" name="intent" value="submit" disabled={pending} className={primaryBtn}>
            {pending ? t("vacancyForm.buttons.sending") : status === "PUBLISHED" ? t("vacancyForm.buttons.saveAndPublish") : t("vacancyForm.buttons.submit")}
          </button>
          <button type="submit" name="intent" value="draft" disabled={pending} className={secondaryBtn}>
            {t("vacancyForm.buttons.saveDraft")}
          </button>
          <Link href="/employer" className="ml-1 text-sm soft-link">
            {t("vacancyForm.buttons.toList")}
          </Link>
        </div>
      </div>

      <aside className="box-border flex max-w-[360px] flex-[1_1_300px] flex-col gap-4">
        <section className="flex flex-col gap-2.5">
          <h2 className="m-0 text-[15px] font-extrabold">{t("vacancyForm.preview.title")}</h2>
          <div className="flex flex-col gap-2.5 neu-card-sm p-[18px]">
            <div className="flex flex-col gap-1">
              <span className="text-base font-extrabold leading-snug">{title || tf("title")}</span>
              <span className="text-[13px] text-[color:var(--soft-muted)]">
                {companyName} · {city ? `${city} · ` : ""}
                {L.WORK_FORMAT_SHORT[workFormat].toLowerCase()}
              </span>
            </div>
            <span className="font-mono text-base font-semibold">{L.formatSalary(toNum(salaryFrom), toNum(salaryTo), currency)}</span>
            <div className="flex flex-wrap gap-1.5">
              <span className="chip-blue">{L.GRADE_LABEL[grade]}</span>
              <span className="chip-flat">{L.WORK_FORMAT_SHORT[workFormat]}</span>
              {skills.slice(0, 4).map((s) => (
                <span key={s} className="neu-chip">
                  {s}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-3 neu-card-sm p-5">
          <h2 className="m-0 text-[15px] font-extrabold">{t("vacancyForm.checks.title")}</h2>
          <ul className="m-0 flex list-none flex-col gap-2.5 p-0 text-sm leading-snug">
            {checks.map((c) => (
              <li key={c.id} className="flex items-start gap-2.5">
                {c.ok ? <OkIcon /> : <WarnIcon />}
                <span className={c.ok ? "" : "text-[#7A5200]"}>{c.text}</span>
              </li>
            ))}
          </ul>
          <p className={hintCls}>{allOk ? t("vacancyForm.checks.allOk") : t("vacancyForm.checks.draftHint")}</p>
        </section>

        <section className="neu-card-sm flex flex-col gap-2 p-5">
          <h2 className="m-0 text-[15px] font-extrabold">{t("billing.title")}</h2>
          <p className="m-0 text-sm leading-relaxed text-[color:var(--soft-muted)]">{t("vacancyForm.tariff.placeholder")}</p>
          <Link href="/employer/billing" className="soft-link text-sm">
            {t("vacancyForm.tariff.change")}
          </Link>
        </section>
      </aside>
    </form>
  );
}

function toNum(s: string): number | null {
  const raw = s.replace(/[^\d]/g, "");
  if (!raw) return null;
  const n = Number(raw);
  return n > 0 ? n : null;
}

function OkIcon() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1F6F58" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mt-px flex-none">
      <path d="M5 12l5 5 9-10" />
    </svg>
  );
}

function WarnIcon() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#B45309" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mt-px flex-none">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v5M12 16h.01" />
    </svg>
  );
}
