import { siteUrl } from "@/lib/mail";
import { db } from "@/lib/db";

/** GET /api/v1/meta → ссылки и настройки для приложения (минимальная версия, политика, канал). */
export async function GET() {
  const published = await db.vacancy.count({ where: { status: "PUBLISHED" } });
  return Response.json(
    {
      minAppVersion: "1.0.0",
      siteUrl: siteUrl("/"),
      privacyUrl: siteUrl("/privacy"),
      termsUrl: siteUrl("/terms"),
      deleteAccountUrl: siteUrl("/me/delete"),
      telegramChannel: "https://t.me/stackworkjobs",
      publishedVacancies: published,
    },
    { headers: { "Cache-Control": "public, max-age=300" } },
  );
}
