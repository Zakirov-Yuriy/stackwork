import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { rateLimited } from "@/lib/rate-limit";
import { newApplicationMail, sendMailSafe, siteUrl } from "@/lib/mail";
import { apiUser, jsonError, readJson, str } from "@/lib/api";
import { sendPushSafe } from "@/lib/push";

/**
 * POST /api/v1/vacancies/:slug/apply {coverLetter?, githubUrl?, resumeUrl?} → {id}.
 * Для вакансий работодателей Stackwork. У импортированных вакансий отклик идёт по applyUrl
 * на сайт источника: приложение открывает его само, здесь ничего не создаётся.
 */
export async function POST(request: NextRequest, ctx: RouteContext<"/api/v1/vacancies/[slug]/apply">) {
  const user = await apiUser(request);
  if (!user) return jsonError(401, "Нужно войти");
  if (user.role !== "CANDIDATE") return jsonError(403, "Откликаться могут только соискатели");
  const fresh = await db.user.findUnique({ where: { id: user.id }, select: { emailVerifiedAt: true, name: true, email: true } });
  if (!fresh?.emailVerifiedAt) return jsonError(403, "Сначала подтвердите почту");
  if (await rateLimited("api-apply", 20, 3600)) return jsonError(429, "Слишком много откликов за час");
  const { slug } = await ctx.params;
  const vacancy = await db.vacancy.findFirst({
    where: { slug, status: "PUBLISHED" },
    select: { id: true, slug: true, title: true, source: true, applyUrl: true, company: { select: { members: { select: { id: true, email: true }, where: { role: "EMPLOYER" } } } } },
  });
  if (!vacancy) return jsonError(404, "Вакансия не опубликована");
  if (vacancy.source !== "MANUAL") return jsonError(409, "Отклик на эту вакансию принимается на сайте работодателя", );
  const body = await readJson(request);
  const coverLetter = str(body.coverLetter, 4000) || null;
  const githubUrl = str(body.githubUrl, 200) || null;
  const resumeUrl = str(body.resumeUrl, 500) || null;
  if (githubUrl && !/^https?:\/\/(www\.)?github\.com\/[\w.-]+\/?/.test(githubUrl)) return jsonError(400, "Ссылка на GitHub вида https://github.com/имя");
  if (resumeUrl && !/^https?:\/\//.test(resumeUrl)) return jsonError(400, "Ссылка на резюме должна начинаться с http");
  if (!coverLetter && !githubUrl && !resumeUrl) return jsonError(400, "Напишите пару слов о себе или дайте ссылку");
  const exists = await db.application.findUnique({ where: { vacancyId_candidateId: { vacancyId: vacancy.id, candidateId: user.id } }, select: { id: true } });
  if (exists) return jsonError(409, "Вы уже откликались на эту вакансию");
  const created = await db.application.create({ data: { vacancyId: vacancy.id, candidateId: user.id, coverLetter, githubUrl, resumeUrl }, select: { id: true } });
  const url = siteUrl(`/employer/vacancies/${vacancy.id}/applications`);
  for (const m of vacancy.company.members) sendMailSafe(newApplicationMail(m.email, { vacancyTitle: vacancy.title, candidateName: fresh.name ?? fresh.email, url }));
  // Работодателям с приложением ещё и push (кабинет работодателя пока на сайте, уведомление ведёт туда)
  sendPushSafe(
    vacancy.company.members.map((m) => m.id),
    { title: "Новый отклик", body: `${fresh.name ?? fresh.email} откликнулся на «${vacancy.title}»`, data: { type: "new_application", vacancySlug: vacancy.slug, url } },
  );
  return Response.json({ id: created.id }, { status: 201 });
}
