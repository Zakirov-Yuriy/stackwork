"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";
import { setSessionCookie, clearSessionCookie } from "@/lib/session";
import { slugify, uniqueSlug } from "@/lib/slug";

export type AuthState = { error?: string; fields?: Record<string, string> } | undefined;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function safeNext(raw: FormDataEntryValue | null, fallback: string) {
  const s = typeof raw === "string" ? raw : "";
  // Только внутренние пути, без протокола и без //
  return s.startsWith("/") && !s.startsWith("//") ? s : fallback;
}

export async function loginAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(formData.get("next"), "/");

  if (!EMAIL_RE.test(email) || !password) {
    return { error: "Введите почту и пароль", fields: { email } };
  }

  const user = await db.user.findUnique({ where: { email } });
  const ok = await verifyPassword(password, user?.passwordHash);
  if (!user || !ok) {
    return { error: "Неверная почта или пароль", fields: { email } };
  }

  // «Запомнить меня»: cookie на 30 дней, иначе до закрытия браузера
  await setSessionCookie({ sub: user.id, role: user.role }, { persistent: formData.get("remember") === "on" });
  redirect(next === "/" ? homeFor(user.role) : next);
}

export async function registerAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
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

  const exists = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (exists) return { error: "Эта почта уже зарегистрирована. Войдите или восстановите пароль", fields };

  const passwordHash = await hashPassword(password);

  const user = await db.$transaction(async (tx) => {
    let companyId: string | undefined;
    if (role === "EMPLOYER") {
      const slug = await uniqueSlug(slugify(companyName) || "company", (s) =>
        tx.company.findUnique({ where: { slug: s }, select: { id: true } }).then(Boolean),
      );
      const company = await tx.company.create({
        data: { slug, name: companyName, initials: initialsOf(companyName) },
      });
      companyId = company.id;
    }
    return tx.user.create({
      data: { email, name, passwordHash, role, companyId },
    });
  });

  await setSessionCookie({ sub: user.id, role: user.role });
  redirect(next === "/" ? homeFor(user.role) : next);
}

export async function logoutAction() {
  await clearSessionCookie();
  redirect("/");
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
