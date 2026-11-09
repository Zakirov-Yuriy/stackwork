import { facetCounts, popularSkills } from "@/lib/vacancies";
import { listLandingSkills } from "@/lib/landing";

/** GET /api/v1/skills → популярные технологии со счётчиками и счётчики форматов и грейдов для фильтров. */
export async function GET() {
  const [popular, all, facets] = await Promise.all([popularSkills(12), listLandingSkills(), facetCounts()]);
  const counts = new Map(all.map((s) => [s.slug, s.total]));
  return Response.json(
    {
      popular: popular.map((s) => ({ slug: s.slug, name: s.name, count: counts.get(s.slug) ?? 0 })),
      all: all.map((s) => ({ slug: s.slug, name: s.name, count: s.total, remote: s.remote })),
      facets,
    },
    { headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=600" } },
  );
}
