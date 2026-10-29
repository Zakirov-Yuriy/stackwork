"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export async function moderateAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/forbidden");

  const id = String(formData.get("id") ?? "");
  const decision = formData.get("decision") === "approve" ? "approve" : "reject";

  const v = await db.vacancy.findUnique({ where: { id }, select: { id: true, slug: true, publishedAt: true } });
  if (!v) redirect("/admin/moderation");

  await db.vacancy.update({
    where: { id },
    data: decision === "approve" ? { status: "PUBLISHED", publishedAt: v.publishedAt ?? new Date() } : { status: "REJECTED" },
  });

  revalidatePath("/admin/moderation");
  revalidatePath("/");
  revalidatePath(`/vacancies/${v.slug}`);
  redirect("/admin/moderation");
}
