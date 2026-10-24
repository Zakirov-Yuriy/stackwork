import type { NextRequest } from "next/server";
import { getVacancyBySlug, similarVacancies } from "@/lib/vacancies";
import { toVacancyDto, jsonError } from "@/lib/api";

/** GET /api/v1/vacancies/:slug — карточка вакансии с полным описанием. */
export async function GET(_request: NextRequest, ctx: RouteContext<"/api/v1/vacancies/[slug]">) {
  const { slug } = await ctx.params;
  const v = await getVacancyBySlug(slug);
  if (!v) return jsonError(404, "Вакансия не найдена");

  const similar = await similarVacancies(
    v.id,
    v.skills.map((s) => s.skillId),
  );

  return Response.json({
    ...toVacancyDto(v),
    company: {
      slug: v.company.slug,
      name: v.company.name,
      initials: v.company.initials,
      industry: v.company.industry,
      city: v.company.city,
      description: v.company.description,
      website: v.company.website,
    },
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
