import { db } from "@/lib/db";
import { vacancyCardInclude } from "@/lib/vacancies";
import { jsonError, toVacancyDto } from "@/lib/api";

/** GET /api/v1/companies/:slug → компания и её открытые вакансии. */
export async function GET(_request: Request, ctx: RouteContext<"/api/v1/companies/[slug]">) {
  const { slug } = await ctx.params;
  const c = await db.company.findUnique({ where: { slug }, select: { slug: true, name: true, initials: true, logoUrl: true, industry: true, city: true, description: true, website: true } });
  if (!c) return jsonError(404, "Компания не найдена");
  const vacancies = await db.vacancy.findMany({ where: { company: { slug }, status: "PUBLISHED" }, include: vacancyCardInclude, orderBy: { publishedAt: "desc" }, take: 100 });
  return Response.json({ company: c, vacancies: vacancies.map(toVacancyDto) }, { headers: { "Cache-Control": "public, max-age=120" } });
}
