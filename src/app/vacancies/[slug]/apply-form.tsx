"use client";

import { useActionState } from "react";
import { applyAction, type ApplyState } from "./actions";

const label = "text-sm font-bold text-[color:var(--soft-text)]";
const hint = "text-xs text-[color:var(--soft-muted)]";

export function ApplyForm({ slug, acceptsGithubLink }: { slug: string; acceptsGithubLink: boolean }) {
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
            Ссылка на резюме
          </label>
          <input id="resumeUrl" name="resumeUrl" type="url" placeholder="https://" className="neu-field" />
          <span className={hint}>Google Docs, hh.ru, PDF на диске, любая открытая ссылка</span>
        </div>
        {acceptsGithubLink ? (
          <div className="flex flex-[1_1_260px] flex-col gap-2">
            <label htmlFor="githubUrl" className={label}>
              GitHub
            </label>
            <input id="githubUrl" name="githubUrl" type="url" placeholder="https://github.com/username" className="neu-field" />
            <span className={hint}>Работодатель принимает отклик без резюме, по коду</span>
          </div>
        ) : null}
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="coverLetter" className={label}>
          Пара слов о себе
        </label>
        <textarea id="coverLetter" name="coverLetter" rows={4} className="neu-field py-3 leading-relaxed" style={{ minHeight: 0 }} />
        <span className={hint}>Чем занимались, почему эта вакансия. Необязательно.</span>
      </div>
      <div>
        <button type="submit" disabled={pending} className="neu-primary-sm" style={{ minHeight: 48, padding: "0 24px", fontSize: 15 }}>
          {pending ? "Отправляем…" : "Отправить отклик"}
        </button>
      </div>
    </form>
  );
}
