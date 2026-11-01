"use server";

import { getTranslations, getLocale } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { redirect } from "@/i18n/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export type ClaimState = { error?: string; success?: string } | undefined;

/** Заявка «Это наша компания»: работодатель просит привязать себя к странице компании из импорта. */
export async function claimCompanyAction(_prev: ClaimState, formData: FormData): Promise<ClaimState> {
  const slug = String(formData.get("slug") ?? "");
  const [t, locale, user] = await Promise.all([getTranslations("company"), getLocale(), getCurrentUser()]);
  if (!user) redirect({ href: `/login?next=${encodeURIComponent(`/companies/${slug}/claim`)}`, locale });
  if (user.role !== "EMPLOYER") return { error: t("claim.errors.employerOnly") };

  const company = await db.company.findUnique({ where: { slug }, select: { id: true, claimedAt: true, name: true } });
  if (!company) return { error: t("page.notFound") };
  if (company.claimedAt) return { error: t("claim.errors.claimedByOther") };

  const message = String(formData.get("message") ?? "").trim().slice(0, 1000) || null;
  const existing = await db.companyClaim.findUnique({ where: { companyId_userId: { companyId: company.id, userId: user.id } }, select: { status: true } });
  if (existing?.status === "PENDING") return { success: t("claim.pending") };

  await db.companyClaim.upsert({
    where: { companyId_userId: { companyId: company.id, userId: user.id } },
    create: { companyId: company.id, userId: user.id, message },
    update: { message, status: "PENDING" },
  });
  revalidatePath("/admin");
  revalidatePath("/admin/companies");
  return { success: t("claim.sent", { name: company.name }) };
}
