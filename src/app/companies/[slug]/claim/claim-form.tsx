"use client";

import { useActionState } from "react";
import { claimCompanyAction, type ClaimState } from "./actions";
import { Field, ErrorBanner, SuccessBanner, textareaCls, primaryBtn } from "@/components/form";

export function ClaimForm({ slug }: { slug: string }) {
  const [state, action, pending] = useActionState<ClaimState, FormData>(claimCompanyAction, undefined);
  if (state?.success) return <SuccessBanner message={state.success} />;
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="slug" value={slug} />
      <ErrorBanner message={state?.error} />
      <Field label="Пара слов о себе" htmlFor="message" hint="Должность, рабочая почта на домене компании или ссылка на профиль: так мы быстрее проверим заявку.">
        <textarea id="message" name="message" rows={4} className={textareaCls} />
      </Field>
      <button type="submit" disabled={pending} className={primaryBtn}>
        {pending ? "Отправляем…" : "Отправить заявку"}
      </button>
    </form>
  );
}
