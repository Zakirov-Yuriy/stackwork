"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export type ClaimState = { error?: string; success?: string } | undefined;

/** Заявка «Это наша компания»: работодатель просит привязать себя к странице компании из импорта. */
export async function claimCompanyAction(_prev: ClaimState, formData: FormData): Promise<ClaimState> {
  const slug = String(formData.get("slug") ?? "");
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/companies/${slug}/claim`)}`);
  if (user.role !== "EMPLOYER") return { error: "Заявку может оставить только аккаунт работодателя. Зарегистрируйте аккаунт работодателя или войдите в него." };

  const company = await db.company.findUnique({ where: { slug }, select: { id: true, claimedAt: true, name: true } });
  if (!company) return { error: "Компания не найдена" };
  if (company.claimedAt) return { error: "Эта страница уже подтверждена другим работодателем. Напишите нам, если это ошибка." };

  const message = String(formData.get("message") ?? "").trim().slice(0, 1000) || null;
  const existing = await db.companyClaim.findUnique({ where: { companyId_userId: { companyId: company.id, userId: user.id } }, select: { status: true } });
  if (existing?.status === "PENDING") return { success: "Заявка уже отправлена, мы проверяем её." };

  await db.companyClaim.upsert({
    where: { companyId_userId: { companyId: company.id, userId: user.id } },
    create: { companyId: company.id, userId: user.id, message },
    update: { message, status: "PENDING" },
  });
  revalidatePath("/admin");
  revalidatePath("/admin/companies");
  return { success: `Заявка отправлена. Мы проверим, что вы представляете компанию «${company.name}», и подключим кабинет: вы увидите вакансии компании в разделе «Мои вакансии».` };
}
