import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { requireEmployer } from "@/lib/guards";
import { EmployerHeader, StatusBadge } from "@/components/employer-shell";
import { SiteFooter } from "@/components/site-footer";
import { VacancyForm } from "../../vacancy-form";
import type { VacancyInput } from "@/lib/vacancy-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("employer");
  return { title: t("vacancyForm.editTitle") };
}

export default async function EditVacancyPage(props: PageProps<"/[locale]/employer/vacancies/[id]/edit">) {
  const user = await requireEmployer("/employer");
  const { id } = await props.params;
  const sp = await props.searchParams;
  const t = await getTranslations("employer.vacancyForm");

  const v = await db.vacancy.findFirst({
    where: { id, companyId: user.companyId },
    include: { skills: { orderBy: { order: "asc" }, include: { skill: true } } },
  });
  if (!v) notFound();

  const initial: VacancyInput = {
    title: v.title,
    direction: v.direction,
    experience: v.experience,
    grade: v.grade,
    workFormat: v.workFormat,
    city: v.city,
    employment: v.employment,
    salaryFrom: v.salaryFrom,
    salaryTo: v.salaryTo,
    currency: v.currency,
    salaryType: v.salaryType,
    skills: v.skills.map((s) => s.skill.name),
    aboutTeam: v.aboutTeam,
    responsibilities: v.responsibilities,
    requirements: v.requirements,
    niceToHave: v.niceToHave,
    conditions: v.conditions,
    acceptsGithubLink: v.acceptsGithubLink,
    showCompanyName: v.showCompanyName,
  };

  return (
    <>
      <EmployerHeader user={user} active="vacancies" />
      <main className="mx-auto box-border flex w-full max-w-[1180px] flex-1 flex-col gap-6 px-6 pb-12 pt-8">
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="m-0 text-[30px] font-extrabold leading-tight tracking-tight">{v.title}</h1>
            <StatusBadge status={v.status} />
          </div>
          <p className="m-0 text-[15px] text-[color:var(--soft-muted)]">
            {v.status === "PUBLISHED"
              ? t("statusPublished")
              : v.status === "MODERATION"
                ? t("statusModeration")
                : v.status === "REJECTED"
                  ? v.moderationComment
                    ? t("statusRejectedWithComment", { comment: v.moderationComment })
                    : t("statusRejected")
                  : t("statusDraft")}
          </p>
        </div>
        <VacancyForm id={v.id} initial={initial} companyName={user.company.name} status={v.status} saved={sp.saved === "1"} />
      </main>
      <SiteFooter compact />
    </>
  );
}
