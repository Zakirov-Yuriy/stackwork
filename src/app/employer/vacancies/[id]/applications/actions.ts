"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import type { ApplicationStatus } from "@/generated/prisma/client";

const ALLOWED: ApplicationStatus[] = ["VIEWED", "INTERVIEW", "OFFER", "REJECTED"];

export async function setApplicationStatusAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "EMPLOYER" && user.role !== "ADMIN") || !user.companyId) redirect("/forbidden");

  const id = String(formData.get("id") ?? "");
  const vacancyId = String(formData.get("vacancyId") ?? "");
  const status = String(formData.get("status") ?? "") as ApplicationStatus;
  if (!ALLOWED.includes(status)) redirect(`/employer/vacancies/${vacancyId}/applications`);

  // Меняем статус только у отклика на вакансию своей компании
  await db.application.updateMany({
    where: { id, vacancy: { id: vacancyId, companyId: user.companyId } },
    data: { status },
  });

  revalidatePath(`/employer/vacancies/${vacancyId}/applications`);
  revalidatePath("/me");
  redirect(`/employer/vacancies/${vacancyId}/applications`);
}
