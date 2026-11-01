import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/guards";
import { EmployerHeader } from "@/components/employer-shell";
import { SiteFooter } from "@/components/site-footer";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("employer");
  return { title: t("billing.title") };
}

export default async function BillingPage() {
  const user = await requireRole("EMPLOYER", "/employer/billing");
  const t = await getTranslations("employer.billing");
  return (
    <>
      <EmployerHeader user={user} active="billing" />
      <main className="mx-auto box-border flex w-full max-w-[1180px] flex-1 flex-col gap-6 px-6 pb-12 pt-8">
        <div className="flex flex-col gap-1.5">
          <h1 className="m-0 text-[30px] font-extrabold leading-tight tracking-tight">{t("title")}</h1>
          <p className="m-0 text-[15px] text-[color:var(--soft-muted)]">{t("current")}</p>
        </div>
        <div className="neu-card flex max-w-[640px] flex-col gap-3 p-7">
          <div className="flex items-center gap-3">
            <span className="chip-blue">{t("free")}</span>
            <span className="text-sm text-[color:var(--soft-muted)]">{t("noLimits")}</span>
          </div>
          <p className="m-0 text-[15px] leading-relaxed">
            {t("text")}
          </p>
        </div>
      </main>
      <SiteFooter compact />
    </>
  );
}
