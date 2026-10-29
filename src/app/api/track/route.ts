import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { deviceOf, isBot, kindOf, mskDay, referrerHost, visitorHash } from "@/lib/stats/track";

/**
 * POST /api/track: просмотр страницы от клиента (sendBeacon).
 * Тело: { path, referrer?, from?, vacancy? }. Роботы и админка не считаются.
 */
export const dynamic = "force-dynamic";

type Body = { path?: string; referrer?: string | null; from?: string | null; vacancy?: string | null };

export async function POST(request: NextRequest) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return new Response(null, { status: 204 });
  }
  const path = typeof body.path === "string" ? body.path.slice(0, 300) : "";
  if (!path.startsWith("/") || path.startsWith("/admin") || path.startsWith("/api")) return new Response(null, { status: 204 });

  const ua = request.headers.get("user-agent") ?? "";
  if (isBot(ua)) return new Response(null, { status: 204 });

  const ip = (request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? "0.0.0.0").split(",")[0].trim();
  const day = mskDay();
  const selfHost = request.headers.get("host");

  let vacancyId: string | null = null;
  const kind = kindOf(path);
  if ((kind === "VACANCY" || kind === "APPLY") && typeof body.vacancy === "string" && body.vacancy) {
    const v = await db.vacancy.findUnique({ where: { slug: body.vacancy.slice(0, 120) }, select: { id: true } });
    vacancyId = v?.id ?? null;
  }

  await db.pageView.create({
    data: {
      day: new Date(`${day}T00:00:00Z`),
      path,
      kind,
      vacancyId,
      visitorHash: visitorHash(ip, ua, day),
      device: deviceOf(ua),
      referrerHost: referrerHost(typeof body.referrer === "string" ? body.referrer : null, selfHost),
      from: typeof body.from === "string" ? body.from.slice(0, 40) : null,
    },
  });
  return new Response(null, { status: 204 });
}
