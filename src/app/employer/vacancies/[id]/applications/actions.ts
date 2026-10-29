"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import type { ApplicationStatus } from "@/generated/prisma/client";
import { sendMailSafe, siteUrl, applicationStatusMail } from "@/lib/mail";
import { APPLICATION_STATUS_LABEL } from "@/lib/labels";

const ALLOWED: ApplicationStatus[] = ["VIEWED", "INTERVIEW", "OFFER", "REJECTED"];

export async function setApplicationStatusAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "EMPLOYER" && user.role !== "ADMIN") || !user.companyId) redirect("/forbidden");

  const id = String(formData.get("id") ?? "");
  const vacancyId = String(formData.get("vacancyId") ?? "");
  const status = String(formData.get("status") ?? "") as ApplicationStatus;
  if (!ALLOWED.includes(status)) redirect(`/employer/vacancies/${vacancyId}/applications`);

  // Меняем статус только у отклика на вакансию своей компании
  const app = await db.application.findFirst({
    where: { id, vacancy: { id: vacancyId, companyId: user.companyId } },
    select: { status: true, candidate: { select: { email: true } }, vacancy: { select: { slug: true, title: true, company: { select: { name: true } } } } },
  });
  if (!app) redirect(`/employer/vacancies/${vacancyId}/applications`);

  await db.application.update({ where: { id }, data: { status } });

  // Соискателю пишем только о содержательных изменениях, не о «просмотрен»
  if (status !== "VIEWED" && status !== app.status) {
    sendMailSafe(
      applicationStatusMail(app.candidate.email, {
        vacancyTitle: app.vacancy.title,
        companyName: app.vacancy.company.name,
        statusLabel: APPLICATION_STATUS_LABEL[status],
        url: siteUrl(`/vacancies/${app.vacancy.slug}`),
      }),
    );
  }

  revalidatePath(`/employer/vacancies/${vacancyId}/applications`);
  revalidatePath("/me");
  redirect(`/employer/vacancies/${vacancyId}/applications`);
}
