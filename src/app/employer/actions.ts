"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { slugify, uniqueSlug } from "@/lib/slug";
import { parseVacancyForm, moderationChecks, type VacancyInput } from "@/lib/vacancy-form";

export type VacancyActionState = { error?: string; success?: string } | undefined;

async function requireEmployerAction() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/employer");
  if (user.role !== "EMPLOYER" && user.role !== "ADMIN") redirect("/forbidden");
  if (!user.companyId) redirect("/employer/company");
  return { ...user, companyId: user.companyId };
}

async function upsertSkills(names: string[]): Promise<string[]> {
  const ids: string[] = [];
  for (const name of names) {
    const slug = slugify(name) || `skill-${Date.now().toString(36)}`;
    const skill = await db.skill.upsert({
      where: { slug },
      update: {},
      create: { slug, name },
      select: { id: true },
    });
    ids.push(skill.id);
  }
  return ids;
}

function dataFromInput(v: VacancyInput) {
  const { skills: _skills, ...rest } = v;
  void _skills;
  return rest;
}

/** Создание или обновление. intent: "draft" | "submit". */
export async function saveVacancyAction(_prev: VacancyActionState, formData: FormData): Promise<VacancyActionState> {
  const user = await requireEmployerAction();
  const id = String(formData.get("id") ?? "") || null;
  const intent = formData.get("intent") === "submit" ? "submit" : "draft";
  const input = parseVacancyForm(formData);

  if (input.title.length < 3) return { error: "Укажите название вакансии" };
  if (input.salaryFrom && input.salaryTo && input.salaryFrom > input.salaryTo) {
    return { error: "Нижняя граница вилки больше верхней" };
  }

  if (intent === "submit") {
    const failed = moderationChecks(input).filter((c) => !c.ok);
    if (failed.length) return { error: `Перед отправкой на модерацию: ${failed.map((c) => c.text.toLowerCase()).join("; ")}` };
  }

  const existing = id
    ? await db.vacancy.findFirst({ where: { id, companyId: user.companyId }, select: { id: true, slug: true, status: true } })
    : null;
  if (id && !existing) return { error: "Вакансия не найдена" };

  const skillIds = await upsertSkills(input.skills);
  const data = dataFromInput(input);
  // Публикуем сразу только если вакансия уже была опубликована и её просто правят.
  const keepPublished = existing?.status === "PUBLISHED" && intent === "submit";
  const status = intent === "submit" ? (keepPublished ? "PUBLISHED" : "MODERATION") : existing?.status === "PUBLISHED" ? "PUBLISHED" : "DRAFT";

  let vacancyId: string;
  if (existing) {
    await db.vacancy.update({
      where: { id: existing.id },
      data: {
        ...data,
        status,
        skills: { deleteMany: {}, create: skillIds.map((skillId, order) => ({ skillId, order })) },
      },
    });
    vacancyId = existing.id;
  } else {
    const slug = await uniqueSlug(slugify(input.title) || "vacancy", (s) =>
      db.vacancy.findUnique({ where: { slug: s }, select: { id: true } }).then(Boolean),
    );
    const created = await db.vacancy.create({
      data: {
        ...data,
        slug,
        status,
        companyId: user.companyId,
        authorId: user.id,
        skills: { create: skillIds.map((skillId, order) => ({ skillId, order })) },
      },
      select: { id: true },
    });
    vacancyId = created.id;
  }

  revalidatePath("/employer");
  revalidatePath("/");
  if (intent === "submit") {
    redirect(`/employer?sent=${vacancyId}`);
  }
  redirect(`/employer/vacancies/${vacancyId}/edit?saved=1`);
}

export async function archiveVacancyAction(formData: FormData) {
  const user = await requireEmployerAction();
  const id = String(formData.get("id") ?? "");
  await db.vacancy.updateMany({
    where: { id, companyId: user.companyId },
    data: { status: "ARCHIVED" },
  });
  revalidatePath("/employer");
  revalidatePath("/");
  redirect("/employer");
}

export async function updateCompanyAction(_prev: VacancyActionState, formData: FormData): Promise<VacancyActionState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/employer/company");
  if (user.role !== "EMPLOYER" && user.role !== "ADMIN") redirect("/forbidden");

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const industry = String(formData.get("industry") ?? "").trim() || null;
  const city = String(formData.get("city") ?? "").trim() || null;
  const website = String(formData.get("website") ?? "").trim() || null;
  if (name.length < 2) return { error: "Укажите название компании" };
  if (website && !/^https?:\/\//.test(website)) return { error: "Сайт должен начинаться с http:// или https://" };

  const initials = name
    .replace(/[«»"']/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  if (user.companyId) {
    await db.company.update({ where: { id: user.companyId }, data: { name, description, industry, city, website, initials } });
  } else {
    const slug = await uniqueSlug(slugify(name) || "company", (s) =>
      db.company.findUnique({ where: { slug: s }, select: { id: true } }).then(Boolean),
    );
    const company = await db.company.create({ data: { slug, name, description, industry, city, website, initials } });
    await db.user.update({ where: { id: user.id }, data: { companyId: company.id } });
  }
  revalidatePath("/employer");
  return { success: "Сохранено" };
}
