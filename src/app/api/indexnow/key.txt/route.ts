import { indexNowKey } from "@/lib/seo/indexing";

/** Файл ключа IndexNow: его адрес передаём как keyLocation при отправке страниц. */
export const dynamic = "force-dynamic";

export async function GET() {
  const key = indexNowKey();
  if (!key) return new Response("not configured", { status: 404 });
  return new Response(key, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
