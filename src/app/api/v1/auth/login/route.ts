import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { rateLimited } from "@/lib/rate-limit";
import { signSession, currentUserSelect } from "@/lib/session";
import { jsonError, readJson, str, toUserDto } from "@/lib/api";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** POST /api/v1/auth/login {email, password} → {token, user}. Токен действует 30 дней. */
export async function POST(request: NextRequest) {
  const body = await readJson(request);
  const email = str(body.email, 200).toLowerCase();
  const password = str(body.password, 200);
  if (!EMAIL_RE.test(email) || !password) return jsonError(400, "Укажите почту и пароль");
  if (await rateLimited("api-login", 10, 300)) return jsonError(429, "Слишком много попыток, подождите пять минут");
  const user = await db.user.findUnique({ where: { email }, select: { ...currentUserSelect, passwordHash: true } });
  const ok = await verifyPassword(password, user?.passwordHash);
  if (!user || !ok) return jsonError(401, "Неверная почта или пароль");
  const token = await signSession({ sub: user.id, role: user.role });
  return Response.json({ token, user: toUserDto(user) });
}
