"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("errors");
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex w-full max-w-[1180px] flex-1 flex-col items-start gap-4 px-6 py-16">
      <p className="font-mono text-sm text-[color:var(--soft-muted)]">500</p>
      <h1 className="m-0 text-[32px] font-extrabold leading-tight tracking-tight">{t("error.title")}</h1>
      <p className="m-0 max-w-[560px] text-base leading-relaxed text-[color:var(--soft-muted)]">
        {t("error.text")}
        {error.digest ? <span className="block pt-2 font-mono text-xs">{t("error.code", { digest: error.digest })}</span> : null}
      </p>
      <div className="flex flex-wrap gap-3 pt-2">
        <button type="button" onClick={reset} className="neu-primary-sm">
          {t("error.retry")}
        </button>
        <Link href="/" className="neu-btn-sm">
          {t("home")}
        </Link>
      </div>
    </main>
  );
}
