import { loadCardVacancy, renderVacancyCard } from "@/lib/og/vacancy-card";

/** Карточка вакансии PNG 1200×630: og:image страницы и картинка поста в Telegram */
export const maxDuration = 30;

export async function GET(_request: Request, ctx: RouteContext<"/api/og/vacancy/[slug]">) {
  const { slug } = await ctx.params;
  const v = await loadCardVacancy(slug.replace(/\.png$/, ""));
  if (!v) return new Response("not found", { status: 404 });
  const img = await renderVacancyCard(v);
  // Картинка меняется только вместе с вакансией: кэшируем на сутки
  img.headers.set("Cache-Control", "public, max-age=86400, s-maxage=86400");
  return img;
}
