import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { siteUrl } from "@/lib/mail";
import { deviceOf, isBot, mskDay, referrerHost, visitorHash } from "@/lib/stats/track";

/**
 * Переход на отклик по короткой ссылке (кнопка «Откликнуться» в Telegram и шаринг).
 * Считает клик как APPLY в статистике и уводит на applyUrl, для вакансий работодателей на форму отклика.
 */
export async function GET(request: Request, ctx: RouteContext<"/apply/[slug]">) {
  const { slug } = await ctx.params;
  const v = await db.vacancy.findFirst({ where: { slug, status: "PUBLISHED" }, select: { id: true, slug: true, source: true, applyUrl: true } });
  if (!v) return NextResponse.redirect(siteUrl(`/vacancies/${slug}`), 302);

  const url = new URL(request.url);
  const from = url.searchParams.get("from")?.slice(0, 40) ?? null;
  const ua = request.headers.get("user-agent") ?? "";
  const ip = (request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? "0.0.0.0").split(",")[0].trim();
  const day = mskDay();
  if (!isBot(ua)) {
    try {
      await db.pageView.create({
        data: {
          day: new Date(`${day}T00:00:00Z`),
          path: `/apply/${v.slug}`,
          kind: "APPLY",
          vacancyId: v.id,
          visitorHash: visitorHash(ip, ua, day),
          device: deviceOf(ua),
          referrerHost: referrerHost(request.headers.get("referer"), url.host),
          from,
        },
      });
    } catch {
      // статистика не должна мешать переходу
    }
  }
  const target = v.source === "MANUAL" || !v.applyUrl ? siteUrl(`/vacancies/${v.slug}?from=${from ?? "apply"}#respond`) : v.applyUrl;
  return NextResponse.redirect(target, 302);
}
