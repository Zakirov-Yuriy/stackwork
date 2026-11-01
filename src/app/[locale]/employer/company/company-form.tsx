"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { updateCompanyAction, type VacancyActionState } from "../actions";
import { Field, ErrorBanner, SuccessBanner, fieldCls, textareaCls, primaryBtn } from "@/components/form";

type Values = { name: string; description: string; industry: string; city: string; website: string };

export function CompanyForm({ initial }: { initial: Values }) {
  const [state, action, pending] = useActionState<VacancyActionState, FormData>(updateCompanyAction, undefined);
  const t = useTranslations("employer.company.form");
  const tc = useTranslations("common");
  return (
    <form action={action} className="neu-card flex max-w-[640px] flex-col gap-[18px] p-7">
      <ErrorBanner message={state?.error} />
      <SuccessBanner message={state?.success} />
      <Field label={t("name")} htmlFor="name">
        <input id="name" name="name" type="text" required defaultValue={initial.name} className={fieldCls} />
      </Field>
      <div className="flex flex-wrap gap-4">
        <Field label={t("industry")} htmlFor="industry" className="flex-[1_1_240px]" hint={t("industryHint")}>
          <input id="industry" name="industry" type="text" defaultValue={initial.industry} className={fieldCls} />
        </Field>
        <Field label={t("city")} htmlFor="city" className="flex-[1_1_240px]">
          <input id="city" name="city" type="text" defaultValue={initial.city} className={fieldCls} />
        </Field>
      </div>
      <Field label={t("website")} htmlFor="website">
        <input id="website" name="website" type="url" placeholder="https://" defaultValue={initial.website} className={fieldCls} />
      </Field>
      <Field label={t("about")} htmlFor="description" hint={t("aboutHint")}>
        <textarea id="description" name="description" rows={4} defaultValue={initial.description} className={textareaCls} />
      </Field>
      <div>
        <button type="submit" disabled={pending} className={primaryBtn}>
          {pending ? t("saving") : tc("actions.save")}
        </button>
      </div>
    </form>
  );
}
