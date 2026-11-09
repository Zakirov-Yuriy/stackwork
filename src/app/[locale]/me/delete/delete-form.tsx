"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { deleteAccountAction, type DeleteState } from "./actions";
import { ErrorBanner, fieldCls, labelCls } from "@/components/form";

export function DeleteForm() {
  const t = useTranslations("me.delete");
  const [state, action, pending] = useActionState<DeleteState, FormData>(deleteAccountAction, undefined);
  return (
    <form action={action} className="flex max-w-[520px] flex-col gap-4">
      <ErrorBanner message={state?.error} />
      <label className="flex flex-col gap-1.5">
        <span className={labelCls}>{t("password")}</span>
        <input name="password" type="password" required autoComplete="current-password" className={fieldCls} />
      </label>
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" name="confirm" required className="mt-1 h-4 w-4" />
        <span>{t("confirm")}</span>
      </label>
      <button type="submit" disabled={pending} className="neu-btn px-6 font-extrabold text-[#b42318]" style={{ minHeight: 52 }}>
        {pending ? t("pending") : t("submit")}
      </button>
    </form>
  );
}
