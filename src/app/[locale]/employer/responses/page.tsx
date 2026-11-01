import type { Metadata } from "next";
import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { db } from "@/lib/db";
import { requireEmployer } from "@/lib/guards";
import { EmployerHeader } from "@/components/employer-shell";
import { SiteFooter } from "@/components/site-footer";
import { makeLabels } from "@/lib/labels";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("employer");
  return { title: t("responses.title") };
}

export default async function ResponsesPage() {
  const user = await requireEmployer("/employer/responses");
  const t = await getTranslations("employer");
  const L = makeLabels(await getLocale());
  const applications = await db.application.findMany({
    where: { vacancy: { companyId: user.companyId } },
    orderBy: { createdAt: "desc" },
    include: { candidate: { select: { name: true, email: true } }, vacancy: { select: { id: true, title: true } } },
    take: 100,
  });
  const fresh = applications.filter((a) => a.status === "NEW").length;

  return (
    <>
      <EmployerHeader user={user} active="responses" />
      <main className="mx-auto box-border flex w-full max-w-[1180px] flex-1 flex-col gap-6 px-6 pb-12 pt-8">
        <div className="flex flex-col gap-1.5">
          <h1 className="m-0 text-[30px] font-extrabold leading-tight tracking-tight">{t("responses.title")}</h1>
          <p className="m-0 text-[15px] text-[color:var(--soft-muted)]">
            {t("responses.summary", {
              total: t("counts.applications", { count: applications.length }),
              fresh: t("counts.fresh", { count: fresh }),
            })}
          </p>
        </div>
        {applications.length === 0 ? (
          <div className="neu-card-sm p-8">
            <p className="m-0 text-lg font-extrabold">{t("responses.emptyTitle")}</p>
            <p className="m-0 mt-1 text-sm text-[color:var(--soft-muted)]">{t("responses.emptyText")}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {applications.map((a) => (
              <article key={a.id} className="flex flex-wrap items-center gap-4 neu-card-sm px-[22px] py-4">
                <div className="flex min-w-0 flex-[1_1_360px] flex-col gap-1">
                  <span className="text-[16px] font-extrabold">{a.candidate.name ?? a.candidate.email}</span>
                  <Link href={`/employer/vacancies/${a.vacancy.id}/applications`} className="text-[13px] soft-link">
                    {a.vacancy.title}
                  </Link>
                </div>
                <span className={a.status === "NEW" ? "chip-blue" : "chip-flat"}>
                  {L.APPLICATION_STATUS_LABEL[a.status]}
                </span>
                <span className="text-[13px] text-[color:var(--soft-muted)]">{L.formatDate(a.createdAt)}</span>
              </article>
            ))}
          </div>
        )}
      </main>
      <SiteFooter compact />
    </>
  );
}
