"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { claimCompanyAction, type ClaimState } from "./actions";
import { Field, ErrorBanner, SuccessBanner, textareaCls, primaryBtn } from "@/components/form";

export function ClaimForm({ slug }: { slug: string }) {
  const t = useTranslations("company.claim.form");
  const [state, action, pending] = useActionState<ClaimState, FormData>(claimCompanyAction, undefined);
  if (state?.success) return <SuccessBanner message={state.success} />;
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="slug" value={slug} />
      <ErrorBanner message={state?.error} />
      <Field label={t("message")} htmlFor="message" hint={t("messageHint")}>
        <textarea id="message" name="message" rows={4} className={textareaCls} />
      </Field>
      <button type="submit" disabled={pending} className={primaryBtn}>
        {pending ? t("sending") : t("submit")}
      </button>
    </form>
  );
}
