"use server";

import { getLocale } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { redirect } from "@/i18n/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import type { ApplicationStatus } from "@/generated/prisma/client";
import { sendMailSafe, siteUrl, applicationStatusMail } from "@/lib/mail";
import { sendPushSafe } from "@/lib/push";
import { makeLabels } from "@/lib/labels";

const ALLOWED: ApplicationStatus[] = ["VIEWED", "INTERVIEW", "OFFER", "REJECTED"];
const NOTE_MAX = 1000;

export async function setApplicationStatusAction(formData: FormData) {
  const user = await getCurrentUser();
  const locale = await getLocale();
  if (!user || (user.role !== "EMPLOYER" && user.role !== "ADMIN") || !user.companyId) redirect({ href: "/forbidden", locale });

  const id = String(formData.get("id") ?? "");
  const vacancyId = String(formData.get("vacancyId") ?? "");
  const status = String(formData.get("status") ?? "") as ApplicationStatus;
  // Необязательное сообщение соискателю: уходит в письмо и push вместе со статусом
  const note = String(formData.get("note") ?? "").replace(/\r\n/g, "\n").trim().slice(0, NOTE_MAX) || null;
  const back = `/employer/vacancies/${vacancyId}/applications`;
  if (!ALLOWED.includes(status)) redirect({ href: back, locale });

  // Меняем статус только у отклика на вакансию своей компании
  const app = await db.application.findFirst({
    where: { id, vacancy: { id: vacancyId, companyId: user.companyId } },
    select: { status: true, candidateId: true, candidate: { select: { email: true } }, vacancy: { select: { slug: true, title: true, company: { select: { name: true } } } } },
  });
  if (!app) redirect({ href: back, locale });

  const changed = status !== app.status;
  await db.application.update({ where: { id }, data: { status, ...(changed || note ? { employerNote: note, statusChangedAt: new Date() } : {}) } });

  // Соискателю пишем о содержательных изменениях (не о «просмотрен») или если работодатель оставил сообщение.
  // Письмо уходит на языке интерфейса работодателя; push всегда на русском (приложение русское).
  if ((status !== "VIEWED" && changed) || note) {
    const statusLabel = makeLabels(locale).APPLICATION_STATUS_LABEL[status];
    sendMailSafe(
      applicationStatusMail(
        app.candidate.email,
        { vacancyTitle: app.vacancy.title, companyName: app.vacancy.company.name, statusLabel, url: siteUrl(`/vacancies/${app.vacancy.slug}`), note },
        locale,
      ),
    );
    const ruStatus = makeLabels("ru").APPLICATION_STATUS_LABEL[status];
    sendPushSafe(app.candidateId, {
      title: changed ? `${app.vacancy.company.name}: ${ruStatus}` : `Сообщение от ${app.vacancy.company.name}`,
      body: note ?? `По вакансии «${app.vacancy.title}»`,
      data: { type: "application_status", applicationId: id, vacancySlug: app.vacancy.slug, status },
    });
  }

  revalidatePath(back);
  revalidatePath("/me");
  redirect({ href: back, locale });
}
