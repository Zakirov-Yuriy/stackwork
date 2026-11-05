import { renderDigestCard } from "@/lib/og/digest-card";
import { lastWeek, periodStats, previousPeriod } from "@/lib/content/stats";

/** Карточка дайджеста 1200×630: превью поста в канале. Неделя берётся как прошедшая относительно её конца. */
export const maxDuration = 30;

export async function GET(_request: Request, ctx: RouteContext<"/api/og/digest/[week]">) {
  const { week } = await ctx.params;
  const m = /^W(\d{4})-(\d{2})(?:\.png)?$/.exec(week);
  if (!m) return new Response("not found", { status: 404 });
  // Находим неделю с таким ISO-номером: идём от ближайшего понедельника назад не больше года
  let period = lastWeek();
  for (let i = 0; i < 54 && period.key !== `W${m[1]}-${m[2]}`; i++) period = lastWeek(new Date(period.from.getTime() - 1));
  if (period.key !== `W${m[1]}-${m[2]}`) return new Response("not found", { status: 404 });
  const [stats, prev] = await Promise.all([periodStats(period, { stacks: 4, topPaid: 1, companies: 1 }), periodStats(previousPeriod(period), { stacks: 1, topPaid: 1, companies: 1 })]);
  const img = await renderDigestCard(stats, prev);
  img.headers.set("Cache-Control", "public, max-age=3600, s-maxage=86400");
  return img;
}
