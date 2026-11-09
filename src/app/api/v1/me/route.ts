import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { apiUser, jsonError, readJson, str, toUserDto } from "@/lib/api";

/** GET /api/v1/me → профиль и счётчики. */
export async function GET(request: NextRequest) {
  const user = await apiUser(request);
  if (!user) return jsonError(401, "Нужно войти");
  const [saved, applications, fresh] = await Promise.all([
    db.savedVacancy.count({ where: { userId: user.id } }),
    db.application.count({ where: { candidateId: user.id } }),
    db.user.findUnique({ where: { id: user.id }, select: { emailVerifiedAt: true } }),
  ]);
  return Response.json({ user: toUserDto({ ...user, emailVerifiedAt: fresh?.emailVerifiedAt ?? user.emailVerifiedAt }), counts: { saved, applications } });
}

/** PATCH /api/v1/me {name} → обновить имя. */
export async function PATCH(request: NextRequest) {
  const user = await apiUser(request);
  if (!user) return jsonError(401, "Нужно войти");
  const body = await readJson(request);
  const name = str(body.name, 100);
  if (name.length < 2) return jsonError(400, "Имя не короче двух символов");
  const updated = await db.user.update({ where: { id: user.id }, data: { name }, select: { id: true, email: true, name: true, role: true, emailVerifiedAt: true } });
  return Response.json({ user: toUserDto({ ...updated, company: null }) });
}

/**
 * DELETE /api/v1/me {password} → удаление аккаунта со всеми данными (требование Google Play).
 * Отклики и сохранённые удаляются каскадом; компания работодателя остаётся.
 */
export async function DELETE(request: NextRequest) {
  const user = await apiUser(request);
  if (!user) return jsonError(401, "Нужно войти");
  const body = await readJson(request);
  const row = await db.user.findUnique({ where: { id: user.id }, select: { passwordHash: true, role: true } });
  if (!row) return jsonError(404, "Пользователь не найден");
  if (row.role === "ADMIN") return jsonError(403, "Аккаунт администратора удаляется только из консоли");
  if (!(await verifyPassword(str(body.password, 200), row.passwordHash))) return jsonError(403, "Неверный пароль");
  await db.user.delete({ where: { id: user.id } });
  return Response.json({ ok: true });
}
