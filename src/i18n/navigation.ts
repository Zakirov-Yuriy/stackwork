import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

/**
 * Link, redirect, useRouter и usePathname с учётом языка: на публичных страницах
 * используем их вместо next/link и next/navigation, чтобы /en не терялся при переходах.
 * redirect принимает объект: redirect({ href: "/login", locale: await getLocale() }).
 */
const nav = createNavigation(routing);

export const Link = nav.Link;
export const usePathname = nav.usePathname;
export const useRouter = nav.useRouter;
export const getPathname = nav.getPathname;
// Явная аннотация типа нужна, чтобы TypeScript понимал, что после redirect код не выполняется
export const redirect: typeof nav.redirect = nav.redirect;
export const permanentRedirect: typeof nav.permanentRedirect = nav.permanentRedirect;
