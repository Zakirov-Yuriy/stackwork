import { sitemapNames, sitemapXml } from "@/lib/seo/sitemaps";

export const revalidate = 3600;

/** Части известны заранее: собираем при сборке и обновляем раз в час; новые части отдаются по запросу */
export async function generateStaticParams() {
  return (await sitemapNames()).map((name) => ({ name: `${name}.xml` }));
}

export async function GET(_req: Request, ctx: RouteContext<"/sitemaps/[name]">) {
  const { name } = await ctx.params;
  const xml = await sitemapXml(name.replace(/\.xml$/, ""));
  if (!xml) return new Response("Not found", { status: 404 });
  return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
}
