"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

/** Добавить или убрать вакансию из избранного. Гостя ведём на вход с возвратом. */
export async function toggleSavedAction(formData: FormData) {
  const vacancyId = String(formData.get("vacancyId") ?? "");
  const back = String(formData.get("back") ?? "/");
  const safeBack = back.startsWith("/") && !back.startsWith("//") ? back : "/";
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(safeBack)}`);

  const key = { userId_vacancyId: { userId: user.id, vacancyId } };
  const existing = await db.savedVacancy.findUnique({ where: key, select: { userId: true } });
  if (existing) {
    await db.savedVacancy.delete({ where: key });
  } else {
    const v = await db.vacancy.findUnique({ where: { id: vacancyId }, select: { id: true } });
    if (v) await db.savedVacancy.create({ data: { userId: user.id, vacancyId } });
  }
  revalidatePath(safeBack);
  revalidatePath("/me/saved");
  redirect(safeBack);
}
