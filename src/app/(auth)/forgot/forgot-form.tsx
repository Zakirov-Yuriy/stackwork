"use client";

import Link from "next/link";
import { useActionState } from "react";
import { forgotAction, type AuthState } from "../actions";
import { SoftLabel, SoftError } from "../auth-card";
import { Turnstile } from "@/components/turnstile";
import { ArrowIcon } from "../login/login-form";

export function ForgotForm({ siteKey }: { siteKey: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(forgotAction, undefined);

  if (state?.success) {
    return (
      <div className="flex flex-col gap-5">
        <div role="status" className="neu-inset rounded-xl px-4 py-3 text-sm font-semibold text-[#1F6F58]">
          {state.success}
        </div>
        <Link href="/login" className="neu-btn inline-flex items-center justify-center">
          Назад ко входу
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-5">
      <SoftError message={state?.error} />
      <div className="flex flex-col gap-2">
        <SoftLabel htmlFor="email">Почта</SoftLabel>
        <input id="email" name="email" type="email" autoComplete="email" required placeholder="you@example.com" defaultValue={state?.fields?.email ?? ""} className="neu-field" />
      </div>
      <Turnstile siteKey={siteKey} />
      <button type="submit" disabled={pending} className="neu-primary inline-flex items-center justify-center gap-2">
        {pending ? "Отправляем…" : "Отправить ссылку"}
        {!pending ? <ArrowIcon /> : null}
      </button>
      <Link href="/login" className="text-center text-sm font-bold text-[color:var(--soft-blue)] hover:underline">
        Вспомнили пароль? Войти
      </Link>
    </form>
  );
}
