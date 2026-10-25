"use client";

import { useActionState } from "react";
import { resetAction, type AuthState } from "../actions";
import { SoftLabel, SoftError } from "../auth-card";
import { ArrowIcon } from "../login/login-form";

export function ResetForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(resetAction, undefined);
  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="token" value={token} />
      <SoftError message={state?.error} />
      <div className="flex flex-col gap-2">
        <SoftLabel htmlFor="password">Новый пароль</SoftLabel>
        <input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} className="neu-field" />
      </div>
      <div className="flex flex-col gap-2">
        <SoftLabel htmlFor="passwordConfirm">Повторите пароль</SoftLabel>
        <input id="passwordConfirm" name="passwordConfirm" type="password" autoComplete="new-password" required minLength={8} className="neu-field" />
      </div>
      <button type="submit" disabled={pending} className="neu-primary inline-flex items-center justify-center gap-2">
        {pending ? "Сохраняем…" : "Сохранить и войти"}
        {!pending ? <ArrowIcon /> : null}
      </button>
    </form>
  );
}
