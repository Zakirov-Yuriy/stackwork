"use client";

import { useActionState } from "react";
import { loginAction, type AuthState } from "../actions";
import { Field, ErrorBanner, fieldCls, primaryBtn } from "@/components/form";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(loginAction, undefined);

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />
      <ErrorBanner message={state?.error} />
      <Field label="Почта" htmlFor="email">
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={state?.fields?.email ?? ""}
          className={fieldCls}
        />
      </Field>
      <Field label="Пароль" htmlFor="password">
        <input id="password" name="password" type="password" autoComplete="current-password" required className={fieldCls} />
      </Field>
      <button type="submit" disabled={pending} className={primaryBtn}>
        {pending ? "Входим…" : "Войти"}
      </button>
    </form>
  );
}
