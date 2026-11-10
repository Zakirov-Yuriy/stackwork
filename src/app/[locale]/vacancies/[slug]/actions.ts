"use server";

import { revalidatePath } from "next/cache";
import { getTranslations, getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { rateLimited } from "@/lib/rate-limit";
import { verifyTurnstile } from "@/lib/turnstile";
import { sendMailSafe, siteUrl, newApplicationMail } from "@/lib/mail";
import { sendPushSafe } from "@/lib/push";

export type ApplyState = { error?: string; success?: string } | undefined;

export async function applyAction(_prev: ApplyState, formData: FormData): Promise<ApplyState> {
  const slug = String(formData.get("slug") ?? "");
  const [user, t, locale] = await Promise.all([getCurrentUser(), getTranslations("vacancy"), getLocale() as Promise<Locale>]);
  if (!user) redirect({ href: `/login?next=${encodeURIComponent(`/vacancies/${slug}#respond`)}`, locale });
  if (user.role !== "CANDIDATE") return { error: t("errors.candidatesOnly") };
  if (!user.emailVerifiedAt) return { error: t("errors.verifyFirst") };
  if (await rateLimited("apply", 20, 3600)) return { error: t("errors.tooMany") };
  if (!(await verifyTurnstile(formData.get("cf-turnstile-response")))) return { error: t("errors.captcha") };

  const vacancy = await db.vacancy.findFirst({
    where: { slug, status: "PUBLISHED" },
    select: { id: true, title: true, acceptsGithubLink: true, company: { select: { members: { select: { id: true, email: true }, where: { role: "EMPLOYER" } } } } },
  });
  if (!vacancy) return { error: t("errors.unpublished") };

  const coverLetter = String(formData.get("coverLetter") ?? "").trim().slice(0, 4000) || null;
  const githubUrl = String(formData.get("githubUrl") ?? "").trim().slice(0, 200) || null;
  const resumeUrl = String(formData.get("resumeUrl") ?? "").trim().slice(0, 500) || null;

  if (githubUrl && !/^https?:\/\/(www\.)?github\.com\/[\w.-]+\/?/.test(githubUrl)) {
    return { error: t("errors.githubFormat") };
  }
  if (resumeUrl && !/^https?:\/\//.test(resumeUrl)) {
    return { error: t("errors.resumeFormat") };
  }
  if (!coverLetter && !githubUrl && !resumeUrl) {
    return { error: t("errors.empty") };
  }

  const exists = await db.application.findUnique({
    where: { vacancyId_candidateId: { vacancyId: vacancy.id, candidateId: user.id } },
    select: { id: true },
  });
  if (exists) return { error: t("errors.duplicate") };

  await db.application.create({
    data: { vacancyId: vacancy.id, candidateId: user.id, coverLetter, githubUrl, resumeUrl },
  });

  // Уведомляем всех сотрудников компании с ролью работодателя
  const url = siteUrl(`/employer/vacancies/${vacancy.id}/applications`);
  for (const m of vacancy.company.members) {
    sendMailSafe(newApplicationMail(m.email, { vacancyTitle: vacancy.title, candidateName: user.name ?? user.email, url }, locale));
  }
  sendPushSafe(
    vacancy.company.members.map((m) => m.id),
    { title: "Новый отклик", body: `${user.name ?? user.email} откликнулся на «${vacancy.title}»`, data: { type: "new_application", vacancySlug: slug, url } },
  );

  revalidatePath(`/vacancies/${slug}`);
  revalidatePath("/me");
  return { success: t("success") };
}
