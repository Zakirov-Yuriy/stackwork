import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { apiUser, jsonError } from "@/lib/api";

/** PUT /api/v1/me/saved/:vacancyId → сохранить; DELETE → убрать. Идемпотентно. */
export async function PUT(request: NextRequest, ctx: RouteContext<"/api/v1/me/saved/[vacancyId]">) {
  const user = await apiUser(request);
  if (!user) return jsonError(401, "Нужно войти");
  const { vacancyId } = await ctx.params;
  const v = await db.vacancy.findUnique({ where: { id: vacancyId }, select: { id: true } });
  if (!v) return jsonError(404, "Вакансия не найдена");
  await db.savedVacancy.upsert({ where: { userId_vacancyId: { userId: user.id, vacancyId } }, create: { userId: user.id, vacancyId }, update: {} });
  return Response.json({ saved: true });
}

export async function DELETE(request: NextRequest, ctx: RouteContext<"/api/v1/me/saved/[vacancyId]">) {
  const user = await apiUser(request);
  if (!user) return jsonError(401, "Нужно войти");
  const { vacancyId } = await ctx.params;
  await db.savedVacancy.deleteMany({ where: { userId: user.id, vacancyId } });
  return Response.json({ saved: false });
}
