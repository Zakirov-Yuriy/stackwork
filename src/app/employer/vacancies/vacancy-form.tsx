"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { saveVacancyAction, type VacancyActionState } from "../actions";
import { Field, ErrorBanner, SuccessBanner, Pill, fieldCls, textareaCls, primaryBtn, secondaryBtn, hintCls } from "@/components/form";
import { DIRECTIONS, CURRENCIES, parseSkills, moderationChecks, type VacancyInput } from "@/lib/vacancy-form";
import { formatSalary, GRADE_LABEL, WORK_FORMAT_SHORT } from "@/lib/labels";

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
  const checks = moderationChecks(preview);
  const allOk = checks.every((c) => c.ok);

  return (
    <form action={action} className="flex flex-wrap items-start gap-6">
      {id ? <input type="hidden" name="id" value={id} /> : null}

      <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-5">
        <ErrorBanner message={state?.error} />
        <SuccessBanner message={saved ? "Черновик сохранён" : state?.success} />

        <section className={sectionCls}>
          <h2 className={h2Cls}>Основное</h2>
          <Field label="Название вакансии" htmlFor="title" hint="Должность и ключевая технология. Без «срочно» и восклицательных знаков.">
            <input id="title" name="title" type="text" required value={title} onChange={(e) => setTitle(e.target.value)} className={fieldCls} />
          </Field>
          <div className="flex flex-wrap gap-4">
            <Field label="Направление" htmlFor="direction" className="flex-[1_1_240px]">
              <select id="direction" name="direction" defaultValue={initial.direction} className={fieldCls}>
                {DIRECTIONS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Опыт" htmlFor="experience" className="flex-[1_1_240px]">
              <select id="experience" name="experience" defaultValue={initial.experience} className={fieldCls}>
                <option value="NONE">Без опыта</option>
                <option value="ONE_TO_THREE">1 до 3 лет</option>
                <option value="THREE_TO_SIX">3 до 6 лет</option>
                <option value="SIX_PLUS">Больше 6 лет</option>
              </select>
            </Field>
          </div>
          <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
            <legend className="mb-0.5 text-sm font-bold">Грейд</legend>
            <div className="flex flex-wrap gap-2" onChange={(e) => setGrade((e.target as HTMLInputElement).value as VacancyInput["grade"])}>
              {(["JUNIOR", "MIDDLE", "SENIOR", "LEAD"] as const).map((g) => (
                <Pill key={g} name="grade" value={g} label={GRADE_LABEL[g]} defaultChecked={initial.grade === g} />
              ))}
            </div>
          </fieldset>
        </section>

        <section className={sectionCls}>
          <h2 className={h2Cls}>Формат и локация</h2>
          <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
            <legend className="mb-0.5 text-sm font-bold">Формат работы</legend>
            <div className="flex flex-wrap gap-2" onChange={(e) => setWorkFormat((e.target as HTMLInputElement).value as VacancyInput["workFormat"])}>
              <Pill name="workFormat" value="REMOTE_OR_OFFICE" label="Удалённо или офис" defaultChecked={initial.workFormat === "REMOTE_OR_OFFICE"} />
              <Pill name="workFormat" value="REMOTE" label="Только удалённо" defaultChecked={initial.workFormat === "REMOTE"} />
              <Pill name="workFormat" value="HYBRID" label="Гибрид" defaultChecked={initial.workFormat === "HYBRID"} />
              <Pill name="workFormat" value="OFFICE" label="Офис" defaultChecked={initial.workFormat === "OFFICE"} />
            </div>
          </fieldset>
          <div className="flex flex-wrap gap-4">
            <Field label="Город офиса" htmlFor="city" className="flex-[1_1_240px]">
              <input id="city" name="city" type="text" value={city} onChange={(e) => setCity(e.target.value)} className={fieldCls} />
            </Field>
            <Field label="Занятость" htmlFor="employment" className="flex-[1_1_240px]">
              <select id="employment" name="employment" defaultValue={initial.employment} className={fieldCls}>
                <option value="FULL_TIME">Полная</option>
                <option value="PART_TIME">Частичная</option>
                <option value="CONTRACT">Проект или контракт</option>
              </select>
            </Field>
          </div>
        </section>

        <section className={sectionCls}>
          <div className="flex flex-col gap-1">
            <h2 className={h2Cls}>Зарплата</h2>
            <p className="m-0 text-[13px] text-[color:var(--soft-muted)]">Обязательное поле: вакансии без вилки на площадке не публикуются.</p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <Field label="От" htmlFor="salaryFrom" className="flex-[1_1_140px]">
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
            <Field label="До" htmlFor="salaryTo" className="flex-[1_1_140px]">
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
            <Field label="Валюта" htmlFor="currency" className="flex-[0_1_110px]">
              <select id="currency" name="currency" value={currency} onChange={(e) => setCurrency(e.target.value)} className={fieldCls}>
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c === "RUB" ? "₽" : c === "USD" ? "$" : "€"}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Тип" htmlFor="salaryType" className="flex-[1_1_160px]">
              <select id="salaryType" name="salaryType" defaultValue={initial.salaryType} className={fieldCls}>
                <option value="NET">На руки</option>
                <option value="GROSS">До вычета НДФЛ</option>
              </select>
            </Field>
          </div>
        </section>

        <section className={sectionCls}>
          <h2 className={h2Cls}>Стек</h2>
          {skills.length ? (
            <div className="flex flex-wrap gap-2">
              {skills.map((s) => (
                <span key={s} className="neu-chip inline-flex min-h-9 items-center text-[13px]">
                  {s}
                </span>
              ))}
            </div>
          ) : null}
          <Field label="Технологии через запятую" htmlFor="skills" hint="Например: Go, PostgreSQL, Kafka, Kubernetes. Минимум три.">
            <input
              id="skills"
              name="skills"
              type="text"
              value={skillsRaw}
              onChange={(e) => setSkillsRaw(e.target.value)}
              placeholder="Go, PostgreSQL, Kafka"
              className={`${fieldCls} font-mono text-sm`}
            />
          </Field>
        </section>

        <section className={sectionCls}>
          <h2 className={h2Cls}>Описание</h2>
          <Field label="О команде" htmlFor="aboutTeam">
            <textarea id="aboutTeam" name="aboutTeam" rows={4} value={aboutTeam} onChange={(e) => setAboutTeam(e.target.value)} className={textareaCls} />
          </Field>
          <Field label="Чем предстоит заниматься" htmlFor="responsibilities" hint="Каждый пункт с новой строки">
            <textarea
              id="responsibilities"
              name="responsibilities"
              rows={4}
              value={responsibilities}
              onChange={(e) => setResponsibilities(e.target.value)}
              className={textareaCls}
            />
          </Field>
          <Field label="Что важно" htmlFor="requirements" hint="Только то, без чего задачи не сделать. Пожелания вынесите в «будет плюсом»">
            <textarea id="requirements" name="requirements" rows={4} value={requirements} onChange={(e) => setRequirements(e.target.value)} className={textareaCls} />
          </Field>
          <Field label="Будет плюсом" htmlFor="niceToHave">
            <textarea id="niceToHave" name="niceToHave" rows={3} defaultValue={initial.niceToHave ?? ""} className={textareaCls} />
          </Field>
          <Field label="Условия" htmlFor="conditions" hint="Оформление, ДМС, техника, обучение">
            <textarea id="conditions" name="conditions" rows={3} value={conditions} onChange={(e) => setConditions(e.target.value)} className={textareaCls} />
          </Field>
        </section>

        <section className={sectionCls}>
          <h2 className={h2Cls}>Отклики</h2>
          <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-sm font-semibold">
            <input type="checkbox" name="acceptsGithubLink" defaultChecked={initial.acceptsGithubLink} className="neu-check" />
            <span>Принимать отклики ссылкой на GitHub без резюме</span>
          </label>
          <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-sm font-semibold">
            <input type="checkbox" name="showCompanyName" defaultChecked={initial.showCompanyName} className="neu-check" />
            <span>Показывать название компании в карточке</span>
          </label>
        </section>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button type="submit" name="intent" value="submit" disabled={pending} className={primaryBtn}>
            {pending ? "Отправляем…" : status === "PUBLISHED" ? "Сохранить и опубликовать" : "Отправить на модерацию"}
          </button>
          <button type="submit" name="intent" value="draft" disabled={pending} className={secondaryBtn}>
            Сохранить черновик
          </button>
          <Link href="/employer" className="ml-1 text-sm soft-link">
            К списку
          </Link>
        </div>
      </div>

      <aside className="box-border flex max-w-[360px] flex-[1_1_300px] flex-col gap-4">
        <section className="flex flex-col gap-2.5">
          <h2 className="m-0 text-[15px] font-extrabold">Так карточка выглядит в поиске</h2>
          <div className="flex flex-col gap-2.5 neu-card-sm p-[18px]">
            <div className="flex flex-col gap-1">
              <span className="text-base font-extrabold leading-snug">{title || "Название вакансии"}</span>
              <span className="text-[13px] text-[color:var(--soft-muted)]">
                {companyName} · {city ? `${city} · ` : ""}
                {WORK_FORMAT_SHORT[workFormat].toLowerCase()}
              </span>
            </div>
            <span className="font-mono text-base font-semibold">{formatSalary(toNum(salaryFrom), toNum(salaryTo), currency)}</span>
            <div className="flex flex-wrap gap-1.5">
              <span className="chip-blue">{GRADE_LABEL[grade]}</span>
              <span className="chip-flat">{WORK_FORMAT_SHORT[workFormat]}</span>
              {skills.slice(0, 4).map((s) => (
                <span key={s} className="neu-chip">
                  {s}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-3 neu-card-sm p-5">
          <h2 className="m-0 text-[15px] font-extrabold">Проверка перед публикацией</h2>
          <ul className="m-0 flex list-none flex-col gap-2.5 p-0 text-sm leading-snug">
            {checks.map((c) => (
              <li key={c.text} className="flex items-start gap-2.5">
                {c.ok ? <OkIcon /> : <WarnIcon />}
                <span className={c.ok ? "" : "text-[#7A5200]"}>{c.text}</span>
              </li>
            ))}
          </ul>
          <p className={hintCls}>{allOk ? "Всё готово, можно отправлять." : "Черновик можно сохранить в любом виде; на модерацию уйдёт только после всех проверок."}</p>
        </section>

        <section className="neu-card-sm flex flex-col gap-2 p-5">
          <h2 className="m-0 text-[15px] font-extrabold">Тариф</h2>
          <p className="m-0 text-sm leading-relaxed text-[color:var(--soft-muted)]">[УСЛОВИЯ ТАРИФА: стоимость публикации, срок размещения, число откликов]</p>
          <Link href="/employer/billing" className="soft-link text-sm">
            Сменить тариф
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
