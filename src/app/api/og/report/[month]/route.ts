import { renderReportChart } from "@/lib/og/report-chart";
import { monthByKey, periodStats } from "@/lib/content/stats";

/** График для статьи: медианные зарплаты по стеку за месяц, ?currency=USD|RUB */
export const maxDuration = 30;

export async function GET(request: Request, ctx: RouteContext<"/api/og/report/[month]">) {
  const { month } = await ctx.params;
  const period = monthByKey(month.replace(/\.png$/, ""));
  if (!period) return new Response("not found", { status: 404 });
  const currency = new URL(request.url).searchParams.get("currency") === "RUB" ? "RUB" : "USD";
  const stats = await periodStats(period, { stacks: 20, topPaid: 1, companies: 1 });
  const img = await renderReportChart(stats, currency);
  img.headers.set("Cache-Control", "public, max-age=3600, s-maxage=86400");
  return img;
}
