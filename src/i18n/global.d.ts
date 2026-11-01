import type { routing } from "./routing";

/** Строгий тип языка для next-intl: getLocale() и useLocale() возвращают "ru" | "en", а не string */
declare module "next-intl" {
  interface AppConfig {
    Locale: (typeof routing.locales)[number];
  }
}
