import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { rateLimited } from "@/lib/rate-limit";
import { signSession } from "@/lib/session";
import { issueToken } from "@/lib/tokens";
import { sendMailSafe, siteUrl, verifyEmailMail } from "@/lib/mail";
import { localizedPath } from "@/i18n/seo";
import { jsonError, readJson, str, toUserDto } from "@/lib/api";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /api/v1/auth/register {name, email, password, consent: true, locale?} → {token, user}.
 * Из приложения регистрируются только соискатели; работодатели через сайт.
 */
export async function POST(request: NextRequest) {
  const body = await readJson(request);
  const name = str(body.name, 100);
  const email = str(body.email, 200).toLowerCase();
  const password = str(body.password, 200);
  const locale = body.locale === "en" ? "en" : "ru";
  if (name.length < 2) return jsonError(400, "Укажите имя");
  if (!EMAIL_RE.test(email)) return jsonError(400, "Проверьте почту");
  if (password.length < 8) return jsonError(400, "Пароль не короче 8 символов");
  if (body.consent !== true) return jsonError(400, "Нужно согласие с условиями и политикой конфиденциальности");
  if (await rateLimited("api-register", 5, 3600)) return jsonError(429, "Слишком много регистраций с этого адреса");
  if (await db.user.findUnique({ where: { email }, select: { id: true } })) return jsonError(409, "Такая почта уже зарегистрирована");
  const user = await db.user.create({ data: { email, name, passwordHash: await hashPassword(password), role: "CANDIDATE" } });
  const verify = await issueToken(user.id, "VERIFY_EMAIL");
  sendMailSafe(verifyEmailMail(user.email, siteUrl(localizedPath(`/verify?token=${verify}`, locale)), locale));
  const token = await signSession({ sub: user.id, role: user.role });
  return Response.json({ token, user: toUserDto({ ...user, company: null }) }, { status: 201 });
}
