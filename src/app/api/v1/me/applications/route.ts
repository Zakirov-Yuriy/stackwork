import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { vacancyCardSelect } from "@/lib/vacancies";
import { APPLICATION_STATUS_LABEL } from "@/lib/labels";
import { apiUser, jsonError, toVacancyDto } from "@/lib/api";

/** GET /api/v1/me/applications → отклики соискателя со статусами. */
export async function GET(request: NextRequest) {
  const user = await apiUser(request);
  if (!user) return jsonError(401, "Нужно войти");
  const rows = await db.application.findMany({ where: { candidateId: user.id }, orderBy: { createdAt: "desc" }, include: { vacancy: { select: vacancyCardSelect } } });
  return Response.json({
    items: rows.map((a) => ({
      id: a.id,
      status: a.status,
      statusLabel: APPLICATION_STATUS_LABEL[a.status],
      coverLetter: a.coverLetter,
      githubUrl: a.githubUrl,
      resumeUrl: a.resumeUrl,
      employerNote: a.employerNote,
      statusChangedAt: a.statusChangedAt?.toISOString() ?? null,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
      vacancy: { ...toVacancyDto(a.vacancy), status: a.vacancy.status },
    })),
  });
}
