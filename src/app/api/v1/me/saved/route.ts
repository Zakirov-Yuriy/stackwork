import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { vacancyCardSelect } from "@/lib/vacancies";
import { apiUser, jsonError, toVacancyDto } from "@/lib/api";

/** GET /api/v1/me/saved → сохранённые вакансии (новые сверху) и список их id. */
export async function GET(request: NextRequest) {
  const user = await apiUser(request);
  if (!user) return jsonError(401, "Нужно войти");
  const rows = await db.savedVacancy.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, include: { vacancy: { select: vacancyCardSelect } } });
  return Response.json({ items: rows.map((r) => ({ ...toVacancyDto(r.vacancy), saved: true, status: r.vacancy.status, savedAt: r.createdAt.toISOString() })), ids: rows.map((r) => r.vacancyId) });
}
