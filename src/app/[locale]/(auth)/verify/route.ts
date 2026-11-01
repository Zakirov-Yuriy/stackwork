import { redirect as plainRedirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { hasLocale } from "next-intl";
import { redirect } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { db } from "@/lib/db";
import { consumeToken } from "@/lib/tokens";
import { getCurrentUser } from "@/lib/session";

function homeFor(role: string) {
  return role === "EMPLOYER" ? "/employer" : role === "ADMIN" ? "/admin" : "/me";
}

/** Редирект с сохранением языка из адреса; админка живёт вне [locale], поэтому для неё префикс не нужен. */
function redirectTo(href: string, locale: Locale): never {
  if (href.startsWith("/admin")) plainRedirect(href);
  redirect({ href, locale });
}

/** GET /verify?token=… (или /en/verify?token=…) — подтверждение почты по ссылке из письма. */
export async function GET(request: NextRequest, ctx: RouteContext<"/[locale]/verify">) {
  const { locale: raw } = await ctx.params;
  const locale: Locale = hasLocale(routing.locales, raw) ? raw : routing.defaultLocale;

  const token = request.nextUrl.searchParams.get("token") ?? "";
  const userId = await consumeToken(token, "VERIFY_EMAIL");
  if (!userId) {
    // Вошедшего ведём в его кабинет с пометкой, гостя на вход
    const current = await getCurrentUser();
    if (current?.emailVerifiedAt) redirectTo(`${homeFor(current.role)}?verify=ok`, locale);
    redirectTo("/login?verify=expired", locale);
  }

  const user = await db.user.update({ where: { id: userId }, data: { emailVerifiedAt: new Date() }, select: { role: true } });
  const current = await getCurrentUser();
  // Если человек вошёл в другой браузер, всё равно подтверждаем и ведём на вход
  if (!current || current.id !== userId) redirectTo("/login?verify=ok", locale);
  redirectTo(`${homeFor(user.role)}?verify=ok`, locale);
}
