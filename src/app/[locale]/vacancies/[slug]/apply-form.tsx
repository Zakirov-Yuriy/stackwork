"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { applyAction, type ApplyState } from "./actions";
import { Turnstile } from "@/components/turnstile";

const label = "text-sm font-bold text-[color:var(--soft-text)]";
const hint = "text-xs text-[color:var(--soft-muted)]";

export function ApplyForm({ slug, acceptsGithubLink, siteKey }: { slug: string; acceptsGithubLink: boolean; siteKey: string }) {
  const t = useTranslations("vacancy.form");
  const [state, action, pending] = useActionState<ApplyState, FormData>(applyAction, undefined);

  if (state?.success) {
    return (
      <div role="status" className="neu-inset rounded-xl px-4 py-3 text-sm font-semibold text-[#1F6F58]">
        {state.success}
      </div>
    );
  }

  return (
    <form action={action} className="flex w-full flex-col gap-5">
      <input type="hidden" name="slug" value={slug} />
      {state?.error ? (
        <div role="alert" className="neu-inset rounded-xl px-4 py-3 text-sm font-semibold text-[#B3261E]">
          {state.error}
        </div>
      ) : null}
      <div className="flex flex-wrap gap-5">
        <div className="flex flex-[1_1_260px] flex-col gap-2">
          <label htmlFor="resumeUrl" className={label}>
            {t("resumeUrl")}
          </label>
          <input id="resumeUrl" name="resumeUrl" type="url" placeholder="https://" className="neu-field" />
          <span className={hint}>{t("resumeHint")}</span>
        </div>
        {acceptsGithubLink ? (
          <div className="flex flex-[1_1_260px] flex-col gap-2">
            <label htmlFor="githubUrl" className={label}>
              {t("github")}
            </label>
            <input id="githubUrl" name="githubUrl" type="url" placeholder="https://github.com/username" className="neu-field" />
            <span className={hint}>{t("githubHint")}</span>
          </div>
        ) : null}
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="coverLetter" className={label}>
          {t("coverLetter")}
        </label>
        <textarea id="coverLetter" name="coverLetter" rows={4} className="neu-field py-3 leading-relaxed" style={{ minHeight: 0 }} />
        <span className={hint}>{t("coverLetterHint")}</span>
      </div>
      <Turnstile siteKey={siteKey} />
      <div>
        <button type="submit" disabled={pending} className="neu-primary-sm" style={{ minHeight: 48, padding: "0 24px", fontSize: 15 }}>
          {pending ? t("sending") : t("submit")}
        </button>
      </div>
    </form>
  );
}
