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
 * С locale добавляется canonical без query-параметров: страницы с фильтрами (/?skills=go, ?page=2)
 * считаются вариантами одной страницы, а не отдельными документами в индексе.
 */
export function languageAlternates(path: string, locale?: string): NonNullable<Metadata["alternates"]> {
  const languages: Record<string, string> = {};
  for (const l of routing.locales) languages[l] = localizedPath(path, l);
  languages["x-default"] = localizedPath(path, routing.defaultLocale);
  return locale ? { canonical: localizedPath(path, locale), languages } : { languages };
}
