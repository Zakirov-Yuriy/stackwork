"use server";

import { redirect } from "next/navigation";
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
const CAPTCHA_ERROR = "Не удалось пройти проверку «я не робот». Обновите страницу и попробуйте снова";
const TOO_MANY = "Слишком много попыток. Подождите несколько минут";

function safeNext(raw: FormDataEntryValue | null, fallback: string) {
  const s = typeof raw === "string" ? raw : "";
  return s.startsWith("/") && !s.startsWith("//") ? s : fallback;
}

function homeFor(role: string) {
  if (role === "EMPLOYER") return "/employer";
  if (role === "ADMIN") return "/admin";
  return "/me";
}

function initialsOf(name: string) {
  const words = name.replace(/[«»"']/g, "").split(/\s+/).filter(Boolean);
  const letters = words.slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "");
  return letters.join("") || name.slice(0, 2).toUpperCase();
}

async function sendVerification(userId: string, email: string) {
  const token = await issueToken(userId, "VERIFY_EMAIL");
  sendMailSafe(verifyEmailMail(email, siteUrl(`/verify?token=${token}`)));
}

// ───────────────────────────── Вход ─────────────────────────────

export async function loginAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(formData.get("next"), "/");

  if (!EMAIL_RE.test(email) || !password) return { error: "Введите почту и пароль", fields: { email } };
  if (await rateLimited("login", 10, 300)) return { error: TOO_MANY, fields: { email } };

  const user = await db.user.findUnique({ where: { email } });
  const ok = await verifyPassword(password, user?.passwordHash);
  if (!user || !ok) return { error: "Неверная почта или пароль", fields: { email } };

  await setSessionCookie({ sub: user.id, role: user.role }, { persistent: formData.get("remember") === "on" });
  redirect(next === "/" ? homeFor(user.role) : next);
}

// ───────────────────────────── Регистрация ─────────────────────────────

export async function registerAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const passwordConfirm = String(formData.get("passwordConfirm") ?? "");
  const role = formData.get("role") === "EMPLOYER" ? "EMPLOYER" : "CANDIDATE";
  const companyName = String(formData.get("companyName") ?? "").trim();
  const consent = formData.get("consent") === "on";
  const next = safeNext(formData.get("next"), "/");
  const fields = { name, email, role, companyName };

  if (name.length < 2) return { error: "Укажите имя", fields };
  if (!EMAIL_RE.test(email)) return { error: "Проверьте адрес почты", fields };
  if (password.length < 8) return { error: "Пароль не короче 8 символов", fields };
  if (password !== passwordConfirm) return { error: "Пароли не совпадают", fields };
  if (role === "EMPLOYER" && companyName.length < 2) return { error: "Укажите название компании", fields };
  if (!consent) return { error: "Нужно согласие на обработку персональных данных", fields };
  if (await rateLimited("register", 5, 3600)) return { error: TOO_MANY, fields };
  if (!(await verifyTurnstile(formData.get("cf-turnstile-response")))) return { error: CAPTCHA_ERROR, fields };

  const exists = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (exists) return { error: "Эта почта уже зарегистрирована. Войдите или восстановите пароль", fields };

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

  await sendVerification(user.id, user.email);
  await setSessionCookie({ sub: user.id, role: user.role });
  redirect(next === "/" ? homeFor(user.role) : next);
}

/** Повторная отправка письма с подтверждением (из баннера). */
export async function resendVerificationAction(): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const fresh = await db.user.findUnique({ where: { id: user.id }, select: { emailVerifiedAt: true } });
  if (fresh?.emailVerifiedAt) return;
  if (await rateLimited("resend", 3, 600)) return;
  await sendVerification(user.id, user.email);
}

export async function logoutAction() {
  await clearSessionCookie();
  redirect("/");
}

// ───────────────────────────── Сброс пароля ─────────────────────────────

export async function forgotAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return { error: "Проверьте адрес почты", fields: { email } };
  if (await rateLimited("forgot", 5, 900)) return { error: TOO_MANY, fields: { email } };
  if (!(await verifyTurnstile(formData.get("cf-turnstile-response")))) return { error: CAPTCHA_ERROR, fields: { email } };

  // Ответ одинаковый независимо от того, есть ли такой адрес: не раскрываем базу
  const user = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (user) {
    const token = await issueToken(user.id, "RESET_PASSWORD");
    sendMailSafe(resetPasswordMail(email, siteUrl(`/reset?token=${token}`)));
  }
  return { success: `Если адрес ${email} зарегистрирован, письмо со ссылкой уже в пути. Проверьте папку «Спам».` };
}

export async function resetAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const passwordConfirm = String(formData.get("passwordConfirm") ?? "");
  if (password.length < 8) return { error: "Пароль не короче 8 символов" };
  if (password !== passwordConfirm) return { error: "Пароли не совпадают" };

  const userId = await consumeToken(token, "RESET_PASSWORD");
  if (!userId) return { error: "Ссылка устарела или уже использована. Запросите сброс заново" };

  const passwordHash = await hashPassword(password);
  // Сброс через письмо заодно подтверждает адрес
  const user = await db.user.update({ where: { id: userId }, data: { passwordHash, emailVerifiedAt: new Date() } });
  await setSessionCookie({ sub: user.id, role: user.role });
  redirect(`${homeFor(user.role)}?reset=1`);
}
