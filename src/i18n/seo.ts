import type { Metadata } from "next";
import { routing } from "./routing";

/** Путь страницы для данного языка: русский без префикса, остальные с /<код> */
export function localizedPath(path: string, locale: string): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  if (locale === routing.defaultLocale) return clean;
  return clean === "/" ? `/${locale}` : `/${locale}${clean}`;
}

/**
 * hreflang-ссылки на версии страницы на всех языках (для generateMetadata).
 * path — путь без языкового префикса, например "/vacancies/senior-go-developer".
 */
export function languageAlternates(path: string): NonNullable<Metadata["alternates"]> {
  const languages: Record<string, string> = {};
  for (const locale of routing.locales) languages[locale] = localizedPath(path, locale);
  languages["x-default"] = localizedPath(path, routing.defaultLocale);
  return { languages };
}
