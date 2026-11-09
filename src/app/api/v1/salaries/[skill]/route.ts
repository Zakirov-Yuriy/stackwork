import { db } from "@/lib/db";
import { vacancyCardInclude } from "@/lib/vacancies";
import { getSkill, getSalaries } from "@/lib/landing";
import { jsonError, toVacancyDto } from "@/lib/api";

/** GET /api/v1/salaries/:skill → медиана, процентили, по грейдам, удалённо и в офисе, динамика, самые высокие вилки. */
export async function GET(_request: Request, ctx: RouteContext<"/api/v1/salaries/[skill]">) {
  const { skill: slug } = await ctx.params;
  const skill = await getSkill(slug);
  if (!skill) return jsonError(404, "Технология не найдена");
  const data = await getSalaries(skill);
  if (!data) return jsonError(404, "Недостаточно вакансий с зарплатой");
  const top = data.topPaid.length ? await db.vacancy.findMany({ where: { slug: { in: data.topPaid }, status: "PUBLISHED" }, include: vacancyCardInclude }) : [];
  const order = new Map(data.topPaid.map((s, i) => [s, i]));
  top.sort((a, b) => (order.get(a.slug) ?? 0) - (order.get(b.slug) ?? 0));
  return Response.json(
    {
      skill: data.skill,
      total: data.total,
      remote: data.remote,
      withSalary: data.withSalary,
      salary: data.salary,
      salaryAlt: data.salaryAlt,
      grades: data.grades,
      byGrade: data.byGrade,
      byFormat: data.byFormat,
      trend: data.trend,
      related: data.related,
      topCompanies: data.topCompanies,
      topPaid: top.map(toVacancyDto),
    },
    { headers: { "Cache-Control": "public, max-age=600, stale-while-revalidate=3600" } },
  );
}
