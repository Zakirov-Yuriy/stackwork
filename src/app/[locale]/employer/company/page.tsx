import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/guards";
import { EmployerHeader } from "@/components/employer-shell";
import { SiteFooter } from "@/components/site-footer";
import { CompanyForm } from "./company-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("employer");
  return { title: t("company.title") };
}

export default async function CompanyPage() {
  const user = await requireRole("EMPLOYER", "/employer/company");
  const t = await getTranslations("employer.company");
  const company = user.companyId ? await db.company.findUnique({ where: { id: user.companyId } }) : null;

  return (
    <>
      <EmployerHeader user={user} active="company" />
      <main className="mx-auto box-border flex w-full max-w-[1180px] flex-1 flex-col gap-6 px-6 pb-12 pt-8">
        <div className="flex flex-col gap-1.5">
          <h1 className="m-0 text-[30px] font-extrabold leading-tight tracking-tight">{t("title")}</h1>
          <p className="m-0 text-[15px] text-[color:var(--soft-muted)]">
            {company ? t("introExisting") : t("introNew")}
          </p>
        </div>
        <CompanyForm
          initial={{
            name: company?.name ?? "",
            description: company?.description ?? "",
            industry: company?.industry ?? "",
            city: company?.city ?? "",
            website: company?.website ?? "",
          }}
        />
      </main>
      <SiteFooter compact />
    </>
  );
}
