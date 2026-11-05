import { sitemapIndexXml } from "@/lib/seo/sitemaps";

export const revalidate = 3600;

export async function GET() {
  return new Response(await sitemapIndexXml(), { headers: { "Content-Type": "application/xml; charset=utf-8" } });
}
