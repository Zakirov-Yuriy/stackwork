import { db } from "@/lib/db";

/** Отдаёт логотип компании из базы. Адрес содержит ?v=<время>, поэтому кэшируется надолго. */
export async function GET(_request: Request, ctx: RouteContext<"/api/company-logo/[id]">) {
  const { id } = await ctx.params;
  const logo = await db.companyLogo.findUnique({ where: { companyId: id }, select: { data: true, mime: true, updatedAt: true } });
  if (!logo) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(logo.data), {
    headers: {
      "Content-Type": logo.mime,
      "Content-Length": String(logo.data.byteLength),
      "Cache-Control": "public, max-age=31536000, immutable",
      "Last-Modified": logo.updatedAt.toUTCString(),
    },
  });
}
