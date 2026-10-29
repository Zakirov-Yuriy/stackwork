"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

/** Смена роли пользователя. Себя разжаловать нельзя, чтобы не остаться без админа. */
export async function setRoleAction(formData: FormData) {
  const me = await getCurrentUser();
  if (!me || me.role !== "ADMIN") redirect("/forbidden");
  const id = String(formData.get("id") ?? "");
  const role = String(formData.get("role") ?? "");
  const back = String(formData.get("back") ?? "/admin/users");
  if (id && id !== me.id && (role === "CANDIDATE" || role === "EMPLOYER" || role === "ADMIN")) {
    await db.user.update({ where: { id }, data: { role } });
  }
  revalidatePath("/admin/users");
  redirect(back.startsWith("/") ? back : "/admin/users");
}
