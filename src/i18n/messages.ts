import type { Locale } from "./routing";

/**
 * Переводы лежат в messages/<язык>/<раздел>.json, раздел = пространство имён:
 * useTranslations("home") читает messages/ru/home.json или messages/en/home.json.
 * Новый раздел: добавить имя сюда и создать файл для каждого языка.
 */
export const NAMESPACES = [
  "common",
  "home",
  "vacancy",
  "company",
  "salaries",
  "pricing",
  "auth",
  "employer",
  "me",
  "report",
  "legal",
  "errors",
] as const;

export type Namespace = (typeof NAMESPACES)[number];

export async function loadMessages(locale: Locale): Promise<Record<string, unknown>> {
  const parts = await Promise.all(
    NAMESPACES.map(async (ns) => [ns, (await import(`../../messages/${locale}/${ns}.json`)).default] as const),
  );
  return Object.fromEntries(parts);
}
