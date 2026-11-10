import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { apiUser, jsonError, readJson, str } from "@/lib/api";
import { pushEnabled } from "@/lib/push";

/**
 * Устройства для push-уведомлений (Firebase Cloud Messaging).
 * PUT { token, kind?, platform?, appVersion? } регистрирует или обновляет адрес устройства текущего пользователя:
 * kind "fid" (Firebase Installation ID, по умолчанию) или "token" (registration token). Один адрес принадлежит
 * одному пользователю (при входе под другим аккаунтом переезжает к нему).
 * DELETE { token } удаляет токен (выход из аккаунта).
 * Ответ содержит enabled: настроен ли сервер на отправку (FIREBASE_SERVICE_ACCOUNT).
 */
export async function PUT(request: NextRequest) {
  const user = await apiUser(request);
  if (!user) return jsonError(401, "Нужно войти");
  const body = await readJson(request);
  const token = str(body.token, 4096).trim();
  if (token.length < 10) return jsonError(400, "Нет токена устройства");
  const kind = body.kind === "token" ? "token" : "fid";
  const platform = str(body.platform, 20).trim() || "android";
  const appVersion = str(body.appVersion, 40).trim() || null;
  await db.deviceToken.upsert({
    where: { token },
    create: { token, kind, userId: user.id, platform, appVersion },
    update: { userId: user.id, kind, platform, appVersion, lastSeenAt: new Date() },
  });
  return Response.json({ ok: true, enabled: pushEnabled() });
}

export async function DELETE(request: NextRequest) {
  const user = await apiUser(request);
  if (!user) return jsonError(401, "Нужно войти");
  const body = await readJson(request);
  const token = str(body.token, 4096).trim();
  if (!token) return jsonError(400, "Нет токена устройства");
  await db.deviceToken.deleteMany({ where: { token, userId: user.id } });
  return Response.json({ ok: true });
}
