"use server";

import { getTranslations, getLocale } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { redirect } from "@/i18n/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { LOGO_MAX_BYTES, removeCompanyLogo, saveCompanyLogo } from "@/lib/company-logo";
import { slugify, skillSlug, uniqueSlug } from "@/lib/slug";
import { parseVacancyForm, moderationChecks, type VacancyInput } from "@/lib/vacancy-form";

export type VacancyActionState = { error?: string; success?: string } | undefined;

async function requireEmployerAction() {
  const user = await getCurrentUser();
  const locale = await getLocale();
  if (!user) redirect({ href: "/login?next=/employer", locale });
  if (user.role !== "EMPLOYER" && user.role !== "ADMIN") redirect({ href: "/forbidden", locale });
  if (!user.companyId) redirect({ href: "/employer/company", locale });
  return { ...user, companyId: user.companyId };
}

async function upsertSkills(names: string[]): Promise<string[]> {
  const ids: string[] = [];
  for (const name of names) {
    const slug = skillSlug(name);
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
  const locale = await getLocale();
  const t = await getTranslations("employer.errors");
  const id = String(formData.get("id") ?? "") || null;
  const intent = formData.get("intent") === "submit" ? "submit" : "draft";
  const input = parseVacancyForm(formData);

  if (input.title.length < 3) return { error: t("titleRequired") };
  if (input.salaryFrom && input.salaryTo && input.salaryFrom > input.salaryTo) {
    return { error: t("salaryRange") };
  }

  if (intent === "submit") {
    if (!user.emailVerifiedAt) return { error: t("verifyEmail") };
    const tc = await getTranslations("employer.vacancyForm.checks");
    const failed = moderationChecks(input, tc).filter((c) => !c.ok);
    if (failed.length) return { error: t("beforeModeration", { list: failed.map((c) => c.text.toLowerCase()).join("; ") }) };
  }

  const existing = id
    ? await db.vacancy.findFirst({ where: { id, companyId: user.companyId }, select: { id: true, slug: true, status: true } })
    : null;
  if (id && !existing) return { error: t("vacancyNotFound") };

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
        // При повторной отправке сбрасываем старую причину отклонения
        ...(intent === "submit" ? { moderationComment: null } : {}),
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
    redirect({ href: `/employer?sent=${vacancyId}`, locale });
  }
  redirect({ href: `/employer/vacancies/${vacancyId}/edit?saved=1`, locale });
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
  redirect({ href: "/employer", locale: await getLocale() });
}

export async function updateCompanyAction(_prev: VacancyActionState, formData: FormData): Promise<VacancyActionState> {
  const user = await getCurrentUser();
  const locale = await getLocale();
  if (!user) redirect({ href: "/login?next=/employer/company", locale });
  if (user.role !== "EMPLOYER" && user.role !== "ADMIN") redirect({ href: "/forbidden", locale });
  const t = await getTranslations("employer");

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const industry = String(formData.get("industry") ?? "").trim() || null;
  const city = String(formData.get("city") ?? "").trim() || null;
  const website = String(formData.get("website") ?? "").trim() || null;
  if (name.length < 2) return { error: t("errors.companyNameRequired") };
  if (website && !/^https?:\/\//.test(website)) return { error: t("errors.websiteProtocol") };

  const initials = name
    .replace(/[«»"']/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  // Логотип: файл проверяем до записи компании, чтобы не сохранить половину формы
  const logoFile = formData.get("logo");
  const logo = logoFile instanceof File && logoFile.size > 0 ? logoFile : null;
  const removeLogo = formData.get("removeLogo") === "1";
  if (logo && logo.size > LOGO_MAX_BYTES) return { error: t("errors.logoTooBig") };

  let companyId = user.companyId;
  if (companyId) {
    await db.company.update({ where: { id: companyId }, data: { name, description, industry, city, website, initials } });
  } else {
    const slug = await uniqueSlug(slugify(name) || "company", (s) =>
      db.company.findUnique({ where: { slug: s }, select: { id: true } }).then(Boolean),
    );
    const company = await db.company.create({ data: { slug, name, description, industry, city, website, initials } });
    await db.user.update({ where: { id: user.id }, data: { companyId: company.id } });
    companyId = company.id;
  }

  if (logo) {
    const problem = await saveCompanyLogo(companyId, logo);
    if (problem === "type") return { error: t("errors.logoType") };
    if (problem === "size") return { error: t("errors.logoTooBig") };
    if (problem === "broken") return { error: t("errors.logoBroken") };
  } else if (removeLogo) {
    await removeCompanyLogo(companyId);
  }

  revalidatePath("/employer");
  revalidatePath("/employer/company");
  return { success: t("company.saved") };
}
