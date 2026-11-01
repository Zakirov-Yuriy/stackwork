"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { Link } from "@/i18n/navigation";
import { loginAction, type AuthState } from "../actions";
import { SoftLabel, SoftError } from "../auth-card";

export function LoginForm({ next }: { next: string }) {
  const t = useTranslations("auth");
  const [state, action, pending] = useActionState<AuthState, FormData>(loginAction, undefined);

  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="next" value={next} />
      <SoftError message={state?.error} />

      <div className="flex flex-col gap-2">
        <SoftLabel htmlFor="email">{t("fields.email")}</SoftLabel>
        <input id="email" name="email" type="email" autoComplete="email" required placeholder="you@example.com" defaultValue={state?.fields?.email ?? ""} className="neu-field" />
      </div>

      <div className="flex flex-col gap-2">
        <SoftLabel htmlFor="password">{t("fields.password")}</SoftLabel>
        <input id="password" name="password" type="password" autoComplete="current-password" required placeholder="••••••••" className="neu-field" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <label className="flex cursor-pointer items-center gap-2.5 font-semibold text-[color:var(--soft-text)]">
          <input type="checkbox" name="remember" defaultChecked className="neu-check" />
          {t("login.remember")}
        </label>
        <Link href="/forgot" className="font-bold text-[color:var(--soft-blue)] hover:underline">
          {t("login.forgot")}
        </Link>
      </div>

      <button type="submit" disabled={pending} className="neu-primary mt-1 inline-flex items-center justify-center gap-2">
        {pending ? t("login.pending") : t("login.submit")}
        {!pending ? <ArrowIcon /> : null}
      </button>
    </form>
  );
}

export function ArrowIcon() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}
