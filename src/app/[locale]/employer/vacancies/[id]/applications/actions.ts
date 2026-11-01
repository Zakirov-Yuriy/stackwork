"use server";

import { getLocale } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { redirect } from "@/i18n/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import type { ApplicationStatus } from "@/generated/prisma/client";
import { sendMailSafe, siteUrl, applicationStatusMail } from "@/lib/mail";
import { makeLabels } from "@/lib/labels";

const ALLOWED: ApplicationStatus[] = ["VIEWED", "INTERVIEW", "OFFER", "REJECTED"];

export async function setApplicationStatusAction(formData: FormData) {
  const user = await getCurrentUser();
  const locale = await getLocale();
  if (!user || (user.role !== "EMPLOYER" && user.role !== "ADMIN") || !user.companyId) redirect({ href: "/forbidden", locale });

  const id = String(formData.get("id") ?? "");
  const vacancyId = String(formData.get("vacancyId") ?? "");
  const status = String(formData.get("status") ?? "") as ApplicationStatus;
  const back = `/employer/vacancies/${vacancyId}/applications`;
  if (!ALLOWED.includes(status)) redirect({ href: back, locale });

  // Меняем статус только у отклика на вакансию своей компании
  const app = await db.application.findFirst({
    where: { id, vacancy: { id: vacancyId, companyId: user.companyId } },
    select: { status: true, candidate: { select: { email: true } }, vacancy: { select: { slug: true, title: true, company: { select: { name: true } } } } },
  });
  if (!app) redirect({ href: back, locale });

  await db.application.update({ where: { id }, data: { status } });

  // Соискателю пишем только о содержательных изменениях, не о «просмотрен».
  // Письмо уходит на языке интерфейса работодателя.
  if (status !== "VIEWED" && status !== app.status) {
    sendMailSafe(
      applicationStatusMail(
        app.candidate.email,
        {
          vacancyTitle: app.vacancy.title,
          companyName: app.vacancy.company.name,
          statusLabel: makeLabels(locale).APPLICATION_STATUS_LABEL[status],
          url: siteUrl(`/vacancies/${app.vacancy.slug}`),
        },
        locale,
      ),
    );
  }

  revalidatePath(back);
  revalidatePath("/me");
  redirect({ href: back, locale });
}
