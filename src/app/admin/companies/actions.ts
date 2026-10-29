"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/forbidden");
  return user;
}

/** Одобрить или отклонить заявку «Это наша компания». При одобрении работодатель привязывается к компании. */
export async function decideClaimAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const decision = formData.get("decision") === "approve" ? "APPROVED" : "REJECTED";
  const claim = await db.companyClaim.findUnique({ where: { id }, select: { id: true, companyId: true, userId: true } });
  if (!claim) redirect("/admin/companies");

  if (decision === "APPROVED") {
    await db.$transaction([
      db.companyClaim.update({ where: { id }, data: { status: "APPROVED" } }),
      db.user.update({ where: { id: claim.userId }, data: { companyId: claim.companyId, role: "EMPLOYER" } }),
      db.company.update({ where: { id: claim.companyId }, data: { claimedAt: new Date(), isExternal: false } }),
      // Остальные заявки на эту компанию закрываем
      db.companyClaim.updateMany({ where: { companyId: claim.companyId, status: "PENDING", id: { not: id } }, data: { status: "REJECTED" } }),
    ]);
  } else {
    await db.companyClaim.update({ where: { id }, data: { status: "REJECTED" } });
  }
  revalidatePath("/admin/companies");
  revalidatePath("/admin");
  redirect("/admin/companies");
}
