import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { rateLimited } from "@/lib/rate-limit";
import { issueToken } from "@/lib/tokens";
import { sendMailSafe, siteUrl, verifyEmailMail } from "@/lib/mail";
import { localizedPath } from "@/i18n/seo";
import { apiUser, jsonError, readJson } from "@/lib/api";

/** POST /api/v1/auth/resend → повторное письмо с подтверждением почты (нужен токен). */
export async function POST(request: NextRequest) {
  const user = await apiUser(request);
  if (!user) return jsonError(401, "Нужно войти");
  if (user.emailVerifiedAt) return Response.json({ ok: true, alreadyVerified: true });
  if (await rateLimited("api-resend", 3, 600)) return jsonError(429, "Письмо уже отправляли, подождите");
  const body = await readJson(request);
  const locale = body.locale === "en" ? "en" : "ru";
  const token = await issueToken(user.id, "VERIFY_EMAIL");
  sendMailSafe(verifyEmailMail(user.email, siteUrl(localizedPath(`/verify?token=${token}`, locale)), locale));
  const fresh = await db.user.findUnique({ where: { id: user.id }, select: { emailVerifiedAt: true } });
  return Response.json({ ok: true, alreadyVerified: Boolean(fresh?.emailVerifiedAt) });
}
