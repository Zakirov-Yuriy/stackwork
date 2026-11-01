"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { updateCompanyAction, type VacancyActionState } from "../actions";
import { Field, ErrorBanner, SuccessBanner, fieldCls, textareaCls, primaryBtn, hintCls } from "@/components/form";
import { CompanyAvatar } from "@/components/company-avatar";

type Values = { name: string; description: string; industry: string; city: string; website: string; logoUrl: string | null; initials: string | null };

export function CompanyForm({ initial }: { initial: Values }) {
  const [state, action, pending] = useActionState<VacancyActionState, FormData>(updateCompanyAction, undefined);
  const t = useTranslations("employer.company.form");
  const tc = useTranslations("common");
  // Превью выбранного файла до отправки и флаг «убрать логотип»
  const [preview, setPreview] = useState<string | null>(null);
  const [remove, setRemove] = useState(false);
  const shown = remove ? null : (preview ?? initial.logoUrl);

  const onFile = (file: File | null) => {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(file ? URL.createObjectURL(file) : null);
    if (file) setRemove(false);
  };

  return (
    <form action={action} encType="multipart/form-data" className="neu-card flex max-w-[640px] flex-col gap-[18px] p-7">
      <ErrorBanner message={state?.error} />
      <SuccessBanner message={state?.success} />
      <div className="flex flex-wrap items-center gap-5">
        <CompanyAvatar name={initial.name || "?"} logoUrl={shown} initials={initial.initials} size={88} rounded={18} />
        <div className="flex min-w-[220px] flex-1 flex-col gap-2">
          <span className="text-sm font-bold text-[color:var(--soft-text)]">{t("logo")}</span>
          <input
            id="logo"
            name="logo"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
            onChange={(e) => onFile(e.target.files?.[0] ?? null)}
            className="text-sm text-[color:var(--soft-muted)] file:mr-3 file:cursor-pointer file:rounded-xl file:border-0 file:bg-[color:var(--soft-bg-raised)] file:px-4 file:py-2 file:text-sm file:font-bold file:text-[color:var(--soft-blue)] file:shadow-[4px_4px_10px_var(--soft-dark),-4px_-4px_10px_var(--soft-light)]"
          />
          <span className={hintCls}>{t("logoHint")}</span>
          {initial.logoUrl && !preview ? (
            <label className="flex cursor-pointer items-center gap-2 text-sm text-[color:var(--soft-muted)]">
              <input type="checkbox" name="removeLogo" value="1" checked={remove} onChange={(e) => setRemove(e.target.checked)} />
              {t("logoRemove")}
            </label>
          ) : null}
        </div>
      </div>
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
