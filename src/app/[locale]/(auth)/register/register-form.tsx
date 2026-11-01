"use client";

import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import { Link } from "@/i18n/navigation";
import { registerAction, type AuthState } from "../actions";
import { SoftLabel, SoftError } from "../auth-card";
import { ArrowIcon } from "../login/login-form";
import { Turnstile } from "@/components/turnstile";

type Role = "CANDIDATE" | "EMPLOYER";

export function RegisterForm({ next, initialRole, siteKey }: { next: string; initialRole: Role; siteKey: string }) {
  const t = useTranslations("auth");
  const [state, action, pending] = useActionState<AuthState, FormData>(registerAction, undefined);
  const [role, setRole] = useState<Role>((state?.fields?.role as Role) ?? initialRole);
  const f = state?.fields ?? {};

  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="next" value={next} />
      <SoftError message={state?.error} />

      <fieldset className="m-0 border-0 p-0">
        <legend className="mb-2 text-sm font-bold text-[color:var(--soft-text)]">{t("register.who")}</legend>
        <div className="neu-tabs grid grid-cols-2 gap-1.5">
          <RoleTab value="CANDIDATE" label={t("register.candidate")} checked={role === "CANDIDATE"} onChange={() => setRole("CANDIDATE")} />
          <RoleTab value="EMPLOYER" label={t("register.employer")} checked={role === "EMPLOYER"} onChange={() => setRole("EMPLOYER")} />
        </div>
      </fieldset>

      <div className="flex flex-col gap-2">
        <SoftLabel htmlFor="name">{role === "EMPLOYER" ? t("fields.yourName") : t("fields.name")}</SoftLabel>
        <input id="name" name="name" type="text" autoComplete="name" required placeholder={t("fields.namePlaceholder")} defaultValue={f.name ?? ""} className="neu-field" />
      </div>

      {role === "EMPLOYER" ? (
        <div className="flex flex-col gap-2">
          <SoftLabel htmlFor="companyName">{t("fields.companyName")}</SoftLabel>
          <input id="companyName" name="companyName" type="text" autoComplete="organization" placeholder={t("fields.companyNamePlaceholder")} defaultValue={f.companyName ?? ""} className="neu-field" />
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        <SoftLabel htmlFor="email">{t("fields.email")}</SoftLabel>
        <input id="email" name="email" type="email" autoComplete="email" required placeholder="you@example.com" defaultValue={f.email ?? ""} className="neu-field" />
      </div>

      <div className="flex flex-col gap-2">
        <SoftLabel htmlFor="password">{t("fields.password")}</SoftLabel>
        <input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} placeholder={t("fields.passwordPlaceholder")} className="neu-field" />
      </div>

      <div className="flex flex-col gap-2">
        <SoftLabel htmlFor="passwordConfirm">{t("fields.passwordConfirm")}</SoftLabel>
        <input id="passwordConfirm" name="passwordConfirm" type="password" autoComplete="new-password" required minLength={8} placeholder={t("fields.passwordConfirmPlaceholder")} className="neu-field" />
      </div>

      <label className="flex cursor-pointer items-start gap-2.5 text-[13px] leading-snug text-[color:var(--soft-muted)]">
        <input type="checkbox" name="consent" className="neu-check mt-0.5" />
        <span>
          {t.rich("register.consent", {
            consent: (chunks) => (
              <Link href="/consent" className="font-semibold text-[color:var(--soft-blue)] hover:underline">
                {chunks}
              </Link>
            ),
            terms: (chunks) => (
              <Link href="/terms" className="font-semibold text-[color:var(--soft-blue)] hover:underline">
                {chunks}
              </Link>
            ),
          })}
        </span>
      </label>

      <Turnstile siteKey={siteKey} />

      <button type="submit" disabled={pending} className="neu-primary mt-1 inline-flex items-center justify-center gap-2">
        {pending ? t("register.pending") : t("register.title")}
        {!pending ? <ArrowIcon /> : null}
      </button>
    </form>
  );
}

function RoleTab({ value, label, checked, onChange }: { value: Role; label: string; checked: boolean; onChange: () => void }) {
  return (
    <label data-active={checked} className="neu-tab inline-flex cursor-pointer items-center justify-center text-[15px]">
      <input type="radio" name="role" value={value} checked={checked} onChange={onChange} className="sr-only" />
      {label}
    </label>
  );
}
