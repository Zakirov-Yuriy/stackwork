"use server";

import { redirect as plainRedirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { localizedPath } from "@/i18n/seo";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";
import { setSessionCookie, clearSessionCookie, getCurrentUser } from "@/lib/session";
import { slugify, uniqueSlug } from "@/lib/slug";
import { issueToken, consumeToken } from "@/lib/tokens";
import { sendMailSafe, siteUrl, verifyEmailMail, resetPasswordMail } from "@/lib/mail";
import { rateLimited } from "@/lib/rate-limit";
import { verifyTurnstile } from "@/lib/turnstile";

export type AuthState = { error?: string; success?: string; fields?: Record<string, string> } | undefined;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Языковой префикс в начале пути (/en, /en/..., /en?...): redirect из @/i18n/navigation добавит его сам
const LOCALE_PREFIX_RE = new RegExp(`^/(${routing.locales.join("|")})(?=/|\\?|#|$)`);

function safeNext(raw: FormDataEntryValue | null, fallback: string) {
  const s = typeof raw === "string" ? raw : "";
  if (!s.startsWith("/") || s.startsWith("//")) return fallback;
  return s.replace(LOCALE_PREFIX_RE, "") || "/";
}

function homeFor(role: string) {
  if (role === "EMPLOYER") return "/employer";
  if (role === "ADMIN") return "/admin";
  return "/me";
}

/** Редирект с учётом языка; админка живёт вне [locale], поэтому для неё префикс не нужен. */
function redirectTo(href: string, locale: Locale): never {
  if (href.startsWith("/admin")) plainRedirect(href);
  redirect({ href, locale });
}

function initialsOf(name: string) {
  const words = name.replace(/[«»"']/g, "").split(/\s+/).filter(Boolean);
  const letters = words.slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "");
  return letters.join("") || name.slice(0, 2).toUpperCase();
}

async function sendVerification(userId: string, email: string, locale: Locale) {
  const token = await issueToken(userId, "VERIFY_EMAIL");
  sendMailSafe(verifyEmailMail(email, siteUrl(localizedPath(`/verify?token=${token}`, locale)), locale));
}

// ───────────────────────────── Вход ─────────────────────────────

export async function loginAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const [t, locale] = await Promise.all([getTranslations("auth.errors"), getLocale()]);
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(formData.get("next"), "/");

  if (!EMAIL_RE.test(email) || !password) return { error: t("emailAndPassword"), fields: { email } };
  if (await rateLimited("login", 10, 300)) return { error: t("tooMany"), fields: { email } };

  const user = await db.user.findUnique({ where: { email } });
  const ok = await verifyPassword(password, user?.passwordHash);
  if (!user || !ok) return { error: t("wrongCredentials"), fields: { email } };

  await setSessionCookie({ sub: user.id, role: user.role }, { persistent: formData.get("remember") === "on" });
  redirectTo(next === "/" ? homeFor(user.role) : next, locale as Locale);
}

// ───────────────────────────── Регистрация ─────────────────────────────

export async function registerAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const [t, locale] = await Promise.all([getTranslations("auth.errors"), getLocale()]);
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const passwordConfirm = String(formData.get("passwordConfirm") ?? "");
  const role = formData.get("role") === "EMPLOYER" ? "EMPLOYER" : "CANDIDATE";
  const companyName = String(formData.get("companyName") ?? "").trim();
  const consent = formData.get("consent") === "on";
  const next = safeNext(formData.get("next"), "/");
  const fields = { name, email, role, companyName };

  if (name.length < 2) return { error: t("name"), fields };
  if (!EMAIL_RE.test(email)) return { error: t("email"), fields };
  if (password.length < 8) return { error: t("passwordShort"), fields };
  if (password !== passwordConfirm) return { error: t("passwordMismatch"), fields };
  if (role === "EMPLOYER" && companyName.length < 2) return { error: t("companyName"), fields };
  if (!consent) return { error: t("consent"), fields };
  if (await rateLimited("register", 5, 3600)) return { error: t("tooMany"), fields };
  if (!(await verifyTurnstile(formData.get("cf-turnstile-response")))) return { error: t("captcha"), fields };

  const exists = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (exists) return { error: t("emailTaken"), fields };

  const passwordHash = await hashPassword(password);

  const user = await db.$transaction(async (tx) => {
    let companyId: string | undefined;
    if (role === "EMPLOYER") {
      const slug = await uniqueSlug(slugify(companyName) || "company", (s) =>
        tx.company.findUnique({ where: { slug: s }, select: { id: true } }).then(Boolean),
      );
      const company = await tx.company.create({ data: { slug, name: companyName, initials: initialsOf(companyName) } });
      companyId = company.id;
    }
    return tx.user.create({ data: { email, name, passwordHash, role, companyId } });
  });

  await sendVerification(user.id, user.email, locale as Locale);
  await setSessionCookie({ sub: user.id, role: user.role });
  redirectTo(next === "/" ? homeFor(user.role) : next, locale as Locale);
}

/** Повторная отправка письма с подтверждением (из баннера). */
export async function resendVerificationAction(): Promise<void> {
  const locale = (await getLocale()) as Locale;
  const user = await getCurrentUser();
  if (!user) redirect({ href: "/login", locale });
  const fresh = await db.user.findUnique({ where: { id: user.id }, select: { emailVerifiedAt: true } });
  if (fresh?.emailVerifiedAt) return;
  if (await rateLimited("resend", 3, 600)) return;
  await sendVerification(user.id, user.email, locale);
}

export async function logoutAction() {
  await clearSessionCookie();
  redirect({ href: "/", locale: await getLocale() });
}

// ───────────────────────────── Сброс пароля ─────────────────────────────

export async function forgotAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const [t, locale] = await Promise.all([getTranslations("auth"), getLocale()]);
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return { error: t("errors.email"), fields: { email } };
  if (await rateLimited("forgot", 5, 900)) return { error: t("errors.tooMany"), fields: { email } };
  if (!(await verifyTurnstile(formData.get("cf-turnstile-response")))) return { error: t("errors.captcha"), fields: { email } };

  // Ответ одинаковый независимо от того, есть ли такой адрес: не раскрываем базу
  const user = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (user) {
    const token = await issueToken(user.id, "RESET_PASSWORD");
    sendMailSafe(resetPasswordMail(email, siteUrl(localizedPath(`/reset?token=${token}`, locale)), locale as Locale));
  }
  return { success: t("forgot.sent", { email }) };
}

export async function resetAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const [t, locale] = await Promise.all([getTranslations("auth.errors"), getLocale()]);
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const passwordConfirm = String(formData.get("passwordConfirm") ?? "");
  if (password.length < 8) return { error: t("passwordShort") };
  if (password !== passwordConfirm) return { error: t("passwordMismatch") };

  const userId = await consumeToken(token, "RESET_PASSWORD");
  if (!userId) return { error: t("resetExpired") };

  const passwordHash = await hashPassword(password);
  // Сброс через письмо заодно подтверждает адрес
  const user = await db.user.update({ where: { id: userId }, data: { passwordHash, emailVerifiedAt: new Date() } });
  await setSessionCookie({ sub: user.id, role: user.role });
  redirectTo(`${homeFor(user.role)}?reset=1`, locale as Locale);
}
