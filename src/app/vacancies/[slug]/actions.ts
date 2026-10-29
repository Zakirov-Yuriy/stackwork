"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export type ApplyState = { error?: string; success?: string } | undefined;

export async function applyAction(_prev: ApplyState, formData: FormData): Promise<ApplyState> {
  const slug = String(formData.get("slug") ?? "");
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/vacancies/${slug}#respond`)}`);
  if (user.role !== "CANDIDATE") return { error: "Откликаться могут только аккаунты соискателей" };

  const vacancy = await db.vacancy.findFirst({ where: { slug, status: "PUBLISHED" }, select: { id: true, acceptsGithubLink: true } });
  if (!vacancy) return { error: "Вакансия больше не опубликована" };

  const coverLetter = String(formData.get("coverLetter") ?? "").trim().slice(0, 4000) || null;
  const githubUrl = String(formData.get("githubUrl") ?? "").trim().slice(0, 200) || null;
  const resumeUrl = String(formData.get("resumeUrl") ?? "").trim().slice(0, 500) || null;

  if (githubUrl && !/^https?:\/\/(www\.)?github\.com\/[\w.-]+\/?/.test(githubUrl)) {
    return { error: "Ссылка на GitHub должна выглядеть как https://github.com/username" };
  }
  if (resumeUrl && !/^https?:\/\//.test(resumeUrl)) {
    return { error: "Ссылка на резюме должна начинаться с http:// или https://" };
  }
  if (!coverLetter && !githubUrl && !resumeUrl) {
    return { error: "Добавьте хотя бы что-то: ссылку на резюме, GitHub или пару слов о себе" };
  }

  const exists = await db.application.findUnique({
    where: { vacancyId_candidateId: { vacancyId: vacancy.id, candidateId: user.id } },
    select: { id: true },
  });
  if (exists) return { error: "Вы уже откликались на эту вакансию" };

  await db.application.create({
    data: { vacancyId: vacancy.id, candidateId: user.id, coverLetter, githubUrl, resumeUrl },
  });

  revalidatePath(`/vacancies/${slug}`);
  revalidatePath("/me");
  return { success: "Отклик отправлен. Ответ работодателя появится в «Моих откликах»." };
}
