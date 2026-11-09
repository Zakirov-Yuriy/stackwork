import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { rateLimited } from "@/lib/rate-limit";
import { issueToken } from "@/lib/tokens";
import { resetPasswordMail, sendMailSafe, siteUrl } from "@/lib/mail";
import { localizedPath } from "@/i18n/seo";
import { jsonError, readJson, str } from "@/lib/api";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** POST /api/v1/auth/forgot {email} → {ok}. Ответ одинаковый для любого адреса. */
export async function POST(request: NextRequest) {
  const body = await readJson(request);
  const email = str(body.email, 200).toLowerCase();
  const locale = body.locale === "en" ? "en" : "ru";
  if (!EMAIL_RE.test(email)) return jsonError(400, "Проверьте почту");
  if (await rateLimited("api-forgot", 5, 900)) return jsonError(429, "Слишком много запросов, подождите");
  const user = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (user) {
    const token = await issueToken(user.id, "RESET_PASSWORD");
    sendMailSafe(resetPasswordMail(email, siteUrl(localizedPath(`/reset?token=${token}`, locale)), locale));
  }
  return Response.json({ ok: true });
}
