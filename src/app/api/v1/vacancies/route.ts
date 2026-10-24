import type { NextRequest } from "next/server";
import { parseFilters, searchVacancies } from "@/lib/vacancies";
import { toVacancyDto } from "@/lib/api";

/**
 * GET /api/v1/vacancies
 *
 * Query-параметры (все необязательные):
 *   q          строка поиска по названию, компании и стеку
 *   city       город или «удалённо»
 *   format     REMOTE | HYBRID | OFFICE, можно несколько через запятую
 *   grade      JUNIOR | MIDDLE | SENIOR | LEAD, можно несколько
 *   exp        NONE | ONE_TO_THREE | THREE_TO_SIX | SIX_PLUS
 *   employment FULL_TIME | PART_TIME | CONTRACT, можно несколько
 *   salary     минимальная сумма, число
 *   skills     slug-и технологий через запятую: go,postgresql
 *   sort       date (по умолчанию) | salary
 *   page       номер страницы, с 1
 */
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const raw: Record<string, string | string[]> = {};
  for (const key of new Set(sp.keys())) {
    const all = sp.getAll(key);
    raw[key] = all.length > 1 ? all : all[0];
  }

  const filters = parseFilters(raw);
  const result = await searchVacancies(filters);

  return Response.json(
    {
      items: result.items.map(toVacancyDto),
      page: result.page,
      pageSize: result.pageSize,
      pages: result.pages,
      total: result.total,
    },
    { headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=60" } },
  );
}
