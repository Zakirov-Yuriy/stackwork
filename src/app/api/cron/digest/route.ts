import type { NextRequest } from "next/server";
import { sendDigest } from "@/lib/content/digest";

/**
 * Еженедельный дайджест в канал: понедельник 06:00 UTC (09:00 по Москве), расписание в vercel.json.
 * Vercel присылает Authorization: Bearer <CRON_SECRET>. Повторный запуск за ту же неделю ничего не шлёт.
 */
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return Response.json({ error: "CRON_SECRET не задан" }, { status: 500 });
  if ((request.headers.get("authorization") ?? "") !== `Bearer ${secret}`) return Response.json({ error: "forbidden" }, { status: 401 });
  const r = await sendDigest();
  return Response.json({ ok: !r.error, ...r });
}
