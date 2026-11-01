"use client";

import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";

/** Переключатель языка RU / EN: тот же путь и параметры, другой префикс. Выбор запоминается в cookie. */
export function LocaleSwitcher({ className = "" }: { className?: string }) {
  const locale = useLocale();
  const t = useTranslations("common.locale");
  const pathname = usePathname();
  const router = useRouter();
  const search = useSearchParams();

  const switchTo = (next: Locale) => {
    if (next === locale) return;
    const query = search?.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { locale: next });
  };

  return (
    <div role="group" aria-label={t("label")} className={`neu-tabs grid grid-cols-2 gap-1 ${className}`} style={{ padding: 3, borderRadius: 11 }}>
      {routing.locales.map((l) => (
        <button
          key={l}
          type="button"
          lang={l}
          title={t(l)}
          data-active={l === locale ? "true" : "false"}
          onClick={() => switchTo(l)}
          className="neu-tab inline-flex items-center justify-center px-2.5 text-[13px] font-bold uppercase"
          style={{ minHeight: 32, borderRadius: 8 }}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
