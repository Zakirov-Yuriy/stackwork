import { defineRouting } from "next-intl/routing";

/**
 * Языки сайта. Русский без префикса (/vacancies/...), английский с префиксом (/en/vacancies/...).
 * Новый язык: добавить код сюда, папку messages/<код>/ с переводами и подпись в LOCALE_LABEL.
 */
export const routing = defineRouting({
  locales: ["ru", "en"],
  defaultLocale: "ru",
  localePrefix: "as-needed",
});

export type Locale = (typeof routing.locales)[number];

export const LOCALE_LABEL: Record<Locale, string> = { ru: "Русский", en: "English" };

/** Код языка для Intl: даты, числа */
export const INTL_LOCALE: Record<Locale, string> = { ru: "ru-RU", en: "en-US" };
