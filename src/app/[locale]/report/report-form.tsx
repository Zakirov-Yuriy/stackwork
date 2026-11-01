"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { reportAction, type ReportState } from "./actions";
import { Field, ErrorBanner, SuccessBanner, fieldCls, textareaCls, primaryBtn } from "@/components/form";
import { Turnstile } from "@/components/turnstile";

// Ключи причин из messages/<язык>/report.json → reasons.*; в базу уходит русский текст (см. actions.ts)
const REASONS = ["salary", "discrimination", "fraud", "outdated", "other"] as const;

export function ReportForm({ slug, email, siteKey }: { slug: string; email: string; siteKey: string }) {
  const t = useTranslations("report");
  const [state, action, pending] = useActionState<ReportState, FormData>(reportAction, undefined);

  if (state?.success) {
    return (
      <div className="flex max-w-[640px] flex-col gap-4">
        <SuccessBanner message={state.success} />
        <Link href={`/vacancies/${slug}`} className="neu-btn-sm self-start">
          {t("backToVacancy")}
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="neu-card flex max-w-[640px] flex-col gap-5 p-7">
      <input type="hidden" name="slug" value={slug} />
      <ErrorBanner message={state?.error} />
      <Field label={t("form.reason")} htmlFor="reason">
        <select id="reason" name="reason" className={fieldCls} defaultValue={REASONS[0]}>
          {REASONS.map((r) => (
            <option key={r} value={r}>
              {t(`reasons.${r}`)}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t("form.comment")} htmlFor="comment" hint={t("form.commentHint")}>
        <textarea id="comment" name="comment" rows={4} className={textareaCls} />
      </Field>
      {!email ? (
        <Field label={t("form.email")} htmlFor="email" hint={t("form.emailHint")}>
          <input id="email" name="email" type="email" className={fieldCls} />
        </Field>
      ) : null}
      <Turnstile siteKey={siteKey} />
      <div>
        <button type="submit" disabled={pending} className={primaryBtn} style={{ minHeight: 48, fontSize: 15 }}>
          {pending ? t("form.sending") : t("form.submit")}
        </button>
      </div>
    </form>
  );
}
