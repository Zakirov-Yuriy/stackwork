import { salaryTables } from "@/lib/salaries";

/** GET /api/v1/salaries → сводная таблица по стекам: rub (в месяц) и usd (в год). */
export async function GET() {
  const tables = await salaryTables();
  return Response.json(tables, { headers: { "Cache-Control": "public, max-age=600, stale-while-revalidate=3600" } });
}
