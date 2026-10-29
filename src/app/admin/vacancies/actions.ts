"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

const ALLOWED = new Set(["PUBLISHED", "ARCHIVED", "REJECTED", "MODERATION"]);

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/forbidden");
  return user;
}

/** Смена статуса одной вакансии из таблицы. Поле back: куда вернуться. */
export async function setVacancyStatusAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  const back = String(formData.get("back") ?? "/admin/vacancies");
  if (!id || !ALLOWED.has(status)) redirect(back);

  const v = await db.vacancy.findUnique({ where: { id }, select: { slug: true, publishedAt: true } });
  if (!v) redirect(back);
  await db.vacancy.update({
    where: { id },
    data: status === "PUBLISHED" ? { status: "PUBLISHED", publishedAt: v.publishedAt ?? new Date() } : { status: status as "ARCHIVED" | "REJECTED" | "MODERATION" },
  });
  revalidatePath("/");
  revalidatePath(`/vacancies/${v.slug}`);
  revalidatePath("/admin/vacancies");
  redirect(back.startsWith("/") ? back : "/admin/vacancies");
}

/** Удалить вакансию целиком (отклики удаляются каскадом). */
export async function deleteVacancyAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const back = String(formData.get("back") ?? "/admin/vacancies");
  if (id) await db.vacancy.delete({ where: { id } }).catch(() => null);
  revalidatePath("/");
  revalidatePath("/admin/vacancies");
  redirect(back.startsWith("/") ? back : "/admin/vacancies");
}
