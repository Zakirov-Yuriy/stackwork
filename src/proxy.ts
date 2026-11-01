import createMiddleware from "next-intl/middleware";
import { NextRequest } from "next/server";
import { routing } from "./i18n/routing";

/**
 * Язык страницы: префикс /en в адресе, иначе cookie NEXT_LOCALE, иначе язык браузера.
 * Браузер без русского (турецкий, немецкий, любой другой) получает английскую версию:
 * next-intl сам отдал бы язык по умолчанию, поэтому подменяем Accept-Language на en.
 * Админка, API и файлы не трогаются.
 */
const intl = createMiddleware(routing);

function prefersRussian(acceptLanguage: string): boolean {
  return acceptLanguage
    .split(",")
    .map((part) => part.split(";")[0].trim().toLowerCase())
    .some((tag) => tag === "ru" || tag.startsWith("ru-"));
}

export default function proxy(request: NextRequest) {
  const accept = request.headers.get("accept-language") ?? "";
  if (accept && !request.cookies.has("NEXT_LOCALE") && !prefersRussian(accept)) {
    const headers = new Headers(request.headers);
    headers.set("accept-language", "en");
    return intl(new NextRequest(request.url, { headers, method: request.method }));
  }
  return intl(request);
}

export const config = {
  matcher: "/((?!api|admin|apply|_next|_vercel|icons|.*\\..*).*)",
};
