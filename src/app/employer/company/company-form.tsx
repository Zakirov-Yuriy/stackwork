"use client";

import { useActionState } from "react";
import { updateCompanyAction, type VacancyActionState } from "../actions";
import { Field, ErrorBanner, SuccessBanner, fieldCls, textareaCls, primaryBtn } from "@/components/form";

type Values = { name: string; description: string; industry: string; city: string; website: string };

export function CompanyForm({ initial }: { initial: Values }) {
  const [state, action, pending] = useActionState<VacancyActionState, FormData>(updateCompanyAction, undefined);
  return (
    <form action={action} className="flex max-w-[640px] flex-col gap-[18px] rounded-xl border border-line bg-card p-6">
      <ErrorBanner message={state?.error} />
      <SuccessBanner message={state?.success} />
      <Field label="Название" htmlFor="name">
        <input id="name" name="name" type="text" required defaultValue={initial.name} className={fieldCls} />
      </Field>
      <div className="flex flex-wrap gap-4">
        <Field label="Отрасль" htmlFor="industry" className="flex-[1_1_240px]" hint="Финтех, E-commerce, SaaS…">
          <input id="industry" name="industry" type="text" defaultValue={initial.industry} className={fieldCls} />
        </Field>
        <Field label="Город" htmlFor="city" className="flex-[1_1_240px]">
          <input id="city" name="city" type="text" defaultValue={initial.city} className={fieldCls} />
        </Field>
      </div>
      <Field label="Сайт" htmlFor="website">
        <input id="website" name="website" type="url" placeholder="https://" defaultValue={initial.website} className={fieldCls} />
      </Field>
      <Field label="О компании" htmlFor="description" hint="Два-три предложения: чем занимаетесь, какая команда">
        <textarea id="description" name="description" rows={4} defaultValue={initial.description} className={textareaCls} />
      </Field>
      <div>
        <button type="submit" disabled={pending} className={primaryBtn}>
          {pending ? "Сохраняем…" : "Сохранить"}
        </button>
      </div>
    </form>
  );
}
