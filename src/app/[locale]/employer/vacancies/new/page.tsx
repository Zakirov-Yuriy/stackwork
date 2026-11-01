import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { requireEmployer } from "@/lib/guards";
import { EmployerHeader } from "@/components/employer-shell";
import { SiteFooter } from "@/components/site-footer";
import { VacancyForm } from "../vacancy-form";
import type { VacancyInput } from "@/lib/vacancy-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("employer");
  return { title: t("vacancyForm.newTitle") };
}

const EMPTY: VacancyInput = {
  title: "",
  direction: "Backend",
  experience: "THREE_TO_SIX",
  grade: "MIDDLE",
  workFormat: "REMOTE_OR_OFFICE",
  city: null,
  employment: "FULL_TIME",
  salaryFrom: null,
  salaryTo: null,
  currency: "RUB",
  salaryType: "NET",
  skills: [],
  aboutTeam: null,
  responsibilities: null,
  requirements: null,
  niceToHave: null,
  conditions: null,
  acceptsGithubLink: true,
  showCompanyName: true,
};

export default async function NewVacancyPage() {
  const user = await requireEmployer("/employer/vacancies/new");
  const t = await getTranslations("employer.vacancyForm");
  return (
    <>
      <EmployerHeader user={user} active="vacancies" />
      <main className="mx-auto box-border flex w-full max-w-[1180px] flex-1 flex-col gap-6 px-6 pb-12 pt-8">
        <div className="flex flex-col gap-1.5">
          <h1 className="m-0 text-[30px] font-extrabold leading-tight tracking-tight">{t("newTitle")}</h1>
          <p className="m-0 text-[15px] text-[color:var(--soft-muted)]">{t("newIntro")}</p>
        </div>
        <VacancyForm initial={EMPTY} companyName={user.company.name} />
      </main>
      <SiteFooter compact />
    </>
  );
}
