"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { sendMailSafe, siteUrl, moderationResultMail } from "@/lib/mail";

export async function moderateAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/forbidden");

  const id = String(formData.get("id") ?? "");
  const decision = formData.get("decision") === "approve" ? "approve" : "reject";
  const comment = String(formData.get("comment") ?? "").trim().slice(0, 1000) || null;

  const v = await db.vacancy.findUnique({
    where: { id },
    select: { id: true, slug: true, title: true, publishedAt: true, author: { select: { email: true } }, company: { select: { members: { select: { email: true }, where: { role: "EMPLOYER" } } } } },
  });
  if (!v) redirect("/admin");

  await db.vacancy.update({
    where: { id },
    data:
      decision === "approve"
        ? { status: "PUBLISHED", publishedAt: v.publishedAt ?? new Date(), moderationComment: null }
        : { status: "REJECTED", moderationComment: comment },
  });

  const recipients = new Set<string>(v.company.members.map((m) => m.email));
  if (v.author?.email) recipients.add(v.author.email);
  const url = decision === "approve" ? siteUrl(`/vacancies/${v.slug}`) : siteUrl(`/employer/vacancies/${v.id}/edit`);
  for (const to of recipients) {
    sendMailSafe(moderationResultMail(to, { vacancyTitle: v.title, approved: decision === "approve", comment, url }));
  }

  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath(`/vacancies/${v.slug}`);
  redirect("/admin");
}

/** Жалоба: снять вакансию с публикации или закрыть жалобу без действий. */
export async function resolveReportAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/forbidden");
  const id = String(formData.get("id") ?? "");
  const vacancyId = String(formData.get("vacancyId") ?? "");
  const decision = formData.get("decision") === "archive" ? "archive" : "dismiss";

  if (decision === "archive") {
    await db.vacancy.update({ where: { id: vacancyId }, data: { status: "ARCHIVED" } });
    // Остальные жалобы на ту же вакансию тоже закрываем
    await db.report.updateMany({ where: { vacancyId, status: "OPEN" }, data: { status: "RESOLVED" } });
  } else {
    await db.report.update({ where: { id }, data: { status: "RESOLVED" } });
  }
  revalidatePath("/admin");
  revalidatePath("/");
  redirect("/admin");
}
