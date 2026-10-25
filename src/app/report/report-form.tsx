"use client";

import Link from "next/link";
import { useActionState } from "react";
import { reportAction, type ReportState } from "./actions";
import { Field, ErrorBanner, SuccessBanner, fieldCls, textareaCls, primaryBtn } from "@/components/form";
import { Turnstile } from "@/components/turnstile";

const REASONS = ["Зарплата в описании не совпадает с вилкой", "Требования к возрасту, полу или национальности", "Мошенничество или платное трудоустройство", "Вакансия неактуальна", "Другое"];

export function ReportForm({ slug, email, siteKey }: { slug: string; email: string; siteKey: string }) {
  const [state, action, pending] = useActionState<ReportState, FormData>(reportAction, undefined);

  if (state?.success) {
    return (
      <div className="flex max-w-[640px] flex-col gap-4">
        <SuccessBanner message={state.success} />
        <Link href={`/vacancies/${slug}`} className="neu-btn-sm self-start">
          Вернуться к вакансии
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="neu-card flex max-w-[640px] flex-col gap-5 p-7">
      <input type="hidden" name="slug" value={slug} />
      <ErrorBanner message={state?.error} />
      <Field label="Причина" htmlFor="reason">
        <select id="reason" name="reason" className={fieldCls} defaultValue={REASONS[0]}>
          {REASONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Комментарий" htmlFor="comment" hint="Что именно не так. Необязательно.">
        <textarea id="comment" name="comment" rows={4} className={textareaCls} />
      </Field>
      {!email ? (
        <Field label="Ваша почта" htmlFor="email" hint="Если нужно будет уточнить детали. Необязательно.">
          <input id="email" name="email" type="email" className={fieldCls} />
        </Field>
      ) : null}
      <Turnstile siteKey={siteKey} />
      <div>
        <button type="submit" disabled={pending} className={primaryBtn} style={{ minHeight: 48, fontSize: 15 }}>
          {pending ? "Отправляем…" : "Отправить жалобу"}
        </button>
      </div>
    </form>
  );
}
