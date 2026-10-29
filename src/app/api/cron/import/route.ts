import type { NextRequest } from "next/server";
import { runImport, hasRunningImport } from "@/lib/import/run";

/**
 * Ежедневный импорт вакансий. Расписание в vercel.json (Hobby: не чаще раза в сутки).
 * Vercel присылает заголовок Authorization: Bearer <CRON_SECRET>, задайте CRON_SECRET в переменных окружения.
 * Вручную: curl -H "Authorization: Bearer $CRON_SECRET" https://site/api/cron/import
 */
export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return Response.json({ error: "CRON_SECRET не задан" }, { status: 500 });
  }
  const auth = request.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${secret}`) {
    return Response.json({ error: "forbidden" }, { status: 401 });
  }
  if (await hasRunningImport()) {
    return Response.json({ skipped: true, reason: "импорт уже идёт" }, { status: 202 });
  }
  const started = Date.now();
  const results = await runImport({ trigger: "CRON" });
  return Response.json({ ok: true, seconds: Math.round((Date.now() - started) / 1000), results });
}
