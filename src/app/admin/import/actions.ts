"use server";

import { after } from "next/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/session";
import { runImport, hasRunningImport } from "@/lib/import/run";
import { isImportSource } from "@/lib/import/sources";
import type { VacancySource } from "@/generated/prisma/client";

/**
 * Кнопка «Запустить импорт». Ответ уходит сразу, сама выборка идёт в after():
 * страница показывает состояние «идёт» и обновляется, пока запуск не закончится.
 */
export async function runImportAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/forbidden");

  const raw = String(formData.get("source") ?? "");
  const sources: VacancySource[] = raw && isImportSource(raw) ? [raw] : [];

  if (await hasRunningImport()) redirect("/admin/import?busy=1");

  after(async () => {
    try {
      await runImport({ sources, trigger: "ADMIN", userId: user.id });
    } finally {
      revalidatePath("/");
      revalidatePath("/admin/import");
    }
  });

  redirect("/admin/import?started=1");
}
