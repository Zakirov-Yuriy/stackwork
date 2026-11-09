import type { NextRequest } from "next/server";
import { getVacancyBySlug, similarVacancies } from "@/lib/vacancies";
import { apiUser, toVacancyDto, jsonError } from "@/lib/api";
import { savedIdsFor } from "@/lib/saved";

/** GET /api/v1/vacancies/:slug — карточка вакансии с полным описанием. */
export async function GET(request: NextRequest, ctx: RouteContext<"/api/v1/vacancies/[slug]">) {
  const { slug } = await ctx.params;
  const [v, user] = await Promise.all([getVacancyBySlug(slug), apiUser(request)]);
  if (!v) return jsonError(404, "Вакансия не найдена");
  const saved = await savedIdsFor(user?.id, [v.id]);

  const similar = await similarVacancies(
    v.id,
    v.skills.map((s) => s.skillId),
  );

  return Response.json({
    ...toVacancyDto(v),
    // ARCHIVED: вакансия закрыта, отклик недоступен, показываем похожие
    status: v.status,
    closed: v.status !== "PUBLISHED",
    saved: saved.has(v.id),
    company: {
      slug: v.company.slug,
      name: v.company.name,
      initials: v.company.initials,
      logoUrl: v.company.logoUrl,
      industry: v.company.industry,
      city: v.company.city,
      description: v.company.description,
      website: v.company.website,
    },
    // У импортированных вакансий описание одним HTML-блоком «как в источнике»
    descriptionHtml: v.descriptionHtml,
    description: {
      aboutTeam: v.aboutTeam,
      responsibilities: v.responsibilities,
      requirements: v.requirements,
      niceToHave: v.niceToHave,
      conditions: v.conditions,
    },
    similar: similar.map(toVacancyDto),
  });
}
