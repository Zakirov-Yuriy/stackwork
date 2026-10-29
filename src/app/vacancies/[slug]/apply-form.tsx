"use client";

import { useActionState } from "react";
import { applyAction, type ApplyState } from "./actions";
import { Field, ErrorBanner, fieldCls, textareaCls } from "@/components/form";

const darkField = `${fieldCls} border-header-line bg-[#1F2226] text-white placeholder:text-[#8A9098] focus:border-white focus:ring-white/10`;
const darkArea = `${textareaCls} border-header-line bg-[#1F2226] text-white placeholder:text-[#8A9098] focus:border-white focus:ring-white/10`;

export function ApplyForm({ slug, acceptsGithubLink }: { slug: string; acceptsGithubLink: boolean }) {
  const [state, action, pending] = useActionState<ApplyState, FormData>(applyAction, undefined);

  if (state?.success) {
    return (
      <div role="status" className="rounded-lg border border-[#2F6F55] bg-[#1C3A2E] px-4 py-3 text-sm font-semibold text-[#BFE9D3]">
        {state.success}
      </div>
    );
  }

  return (
    <form action={action} className="flex w-full flex-col gap-4">
      <input type="hidden" name="slug" value={slug} />
      <ErrorBanner message={state?.error} />
      <div className="flex flex-wrap gap-4">
        <Field label="Ссылка на резюме" htmlFor="resumeUrl" className="flex-[1_1_260px] text-white" hint="Google Docs, hh.ru, PDF на диске, любая открытая ссылка">
          <input id="resumeUrl" name="resumeUrl" type="url" placeholder="https://" className={darkField} />
        </Field>
        {acceptsGithubLink ? (
          <Field label="GitHub" htmlFor="githubUrl" className="flex-[1_1_260px] text-white" hint="Работодатель принимает отклик без резюме, по коду">
            <input id="githubUrl" name="githubUrl" type="url" placeholder="https://github.com/username" className={darkField} />
          </Field>
        ) : null}
      </div>
      <Field label="Пара слов о себе" htmlFor="coverLetter" className="text-white" hint="Чем занимались, почему эта вакансия. Необязательно.">
        <textarea id="coverLetter" name="coverLetter" rows={4} className={darkArea} />
      </Field>
      <div>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-12 items-center rounded-[10px] bg-accent px-6 text-[15px] font-extrabold text-ink hover:brightness-95 disabled:opacity-60"
        >
          {pending ? "Отправляем…" : "Отправить отклик"}
        </button>
      </div>
    </form>
  );
}
