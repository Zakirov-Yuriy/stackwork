"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { resetAction, type AuthState } from "../actions";
import { SoftLabel, SoftError } from "../auth-card";
import { ArrowIcon } from "../login/login-form";

export function ResetForm({ token }: { token: string }) {
  const t = useTranslations("auth");
  const [state, action, pending] = useActionState<AuthState, FormData>(resetAction, undefined);
  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="token" value={token} />
      <SoftError message={state?.error} />
      <div className="flex flex-col gap-2">
        <SoftLabel htmlFor="password">{t("reset.title")}</SoftLabel>
        <input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} className="neu-field" />
      </div>
      <div className="flex flex-col gap-2">
        <SoftLabel htmlFor="passwordConfirm">{t("fields.passwordConfirm")}</SoftLabel>
        <input id="passwordConfirm" name="passwordConfirm" type="password" autoComplete="new-password" required minLength={8} className="neu-field" />
      </div>
      <button type="submit" disabled={pending} className="neu-primary inline-flex items-center justify-center gap-2">
        {pending ? t("reset.pending") : t("reset.submit")}
        {!pending ? <ArrowIcon /> : null}
      </button>
    </form>
  );
}
