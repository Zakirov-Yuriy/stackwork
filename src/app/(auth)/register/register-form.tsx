"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { registerAction, type AuthState } from "../actions";
import { Field, ErrorBanner, fieldCls, primaryBtn } from "@/components/form";

type Role = "CANDIDATE" | "EMPLOYER";

export function RegisterForm({ next, initialRole }: { next: string; initialRole: Role }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(registerAction, undefined);
  const [role, setRole] = useState<Role>((state?.fields?.role as Role) ?? initialRole);

  const f = state?.fields ?? {};

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />
      <ErrorBanner message={state?.error} />

      <fieldset className="m-0 flex gap-2 border-0 p-0">
        <legend className="mb-1.5 text-sm font-bold">Кто вы</legend>
        <RoleOption
          value="CANDIDATE"
          title="Ищу работу"
          hint="Резюме и отклики на вакансии"
          checked={role === "CANDIDATE"}
          onChange={() => setRole("CANDIDATE")}
        />
        <RoleOption
          value="EMPLOYER"
          title="Нанимаю"
          hint="Вакансии и отклики кандидатов"
          checked={role === "EMPLOYER"}
          onChange={() => setRole("EMPLOYER")}
        />
      </fieldset>

      <Field label={role === "EMPLOYER" ? "Ваше имя" : "Имя"} htmlFor="name">
        <input id="name" name="name" type="text" autoComplete="name" required defaultValue={f.name ?? ""} className={fieldCls} />
      </Field>

      {role === "EMPLOYER" ? (
        <Field label="Название компании" htmlFor="companyName" hint="Как в карточке вакансии. Поменять можно позже в кабинете.">
          <input id="companyName" name="companyName" type="text" autoComplete="organization" defaultValue={f.companyName ?? ""} className={fieldCls} />
        </Field>
      ) : null}

      <Field label="Почта" htmlFor="email">
        <input id="email" name="email" type="email" autoComplete="email" required defaultValue={f.email ?? ""} className={fieldCls} />
      </Field>

      <Field label="Пароль" htmlFor="password" hint="Не короче 8 символов">
        <input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} className={fieldCls} />
      </Field>

      <label className="flex cursor-pointer items-start gap-2.5 text-[13px] leading-snug text-muted">
        <input type="checkbox" name="consent" className="mt-0.5 h-[18px] w-[18px] flex-none accent-ink" />
        <span>
          Даю{" "}
          <Link href="/consent" className="font-semibold text-link hover:text-ink">
            согласие на обработку персональных данных
          </Link>{" "}
          и принимаю{" "}
          <Link href="/terms" className="font-semibold text-link hover:text-ink">
            пользовательское соглашение
          </Link>
          .
        </span>
      </label>

      <button type="submit" disabled={pending} className={primaryBtn}>
        {pending ? "Создаём аккаунт…" : "Зарегистрироваться"}
      </button>
    </form>
  );
}

function RoleOption({
  value,
  title,
  hint,
  checked,
  onChange,
}: {
  value: Role;
  title: string;
  hint: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label
      className={`flex flex-1 cursor-pointer flex-col gap-0.5 rounded-[10px] border px-3.5 py-3 ${
        checked ? "border-ink bg-ink text-white" : "border-line-2 bg-card text-ink hover:border-ink"
      }`}
    >
      <input type="radio" name="role" value={value} checked={checked} onChange={onChange} className="sr-only" />
      <span className="text-[15px] font-extrabold">{title}</span>
      <span className={`text-xs ${checked ? "text-header-muted" : "text-muted"}`}>{hint}</span>
    </label>
  );
}
