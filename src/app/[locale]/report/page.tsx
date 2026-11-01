import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { db } from "@/lib/db";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getCurrentUser } from "@/lib/session";
import { turnstileSiteKey } from "@/lib/turnstile";
import { ReportForm } from "./report-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("report");
  return { title: t("title") };
}

export default async function ReportPage(props: PageProps<"/[locale]/report">) {
  const sp = await props.searchParams;
  const slug = typeof sp.vacancy === "string" ? sp.vacancy : "";
  const [vacancy, user, t] = await Promise.all([
    slug ? db.vacancy.findUnique({ where: { slug }, select: { title: true, slug: true, company: { select: { name: true } } } }) : null,
    getCurrentUser(),
    getTranslations("report"),
  ]);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto box-border flex w-full max-w-[1180px] flex-1 flex-col gap-6 px-6 pb-14 pt-8">
        <div className="flex max-w-[640px] flex-col gap-2">
          <h1 className="m-0 text-[30px] font-extrabold leading-tight tracking-tight">{t("title")}</h1>
          {vacancy ? (
            <p className="m-0 text-[15px] text-[color:var(--soft-muted)]">
              <Link href={`/vacancies/${vacancy.slug}`} className="soft-link">
                {vacancy.title}
              </Link>{" "}
              · {vacancy.company.name}
            </p>
          ) : (
            <p className="m-0 text-[15px] text-[color:var(--soft-muted)]">{t("notFound")}</p>
          )}
        </div>
        {vacancy ? <ReportForm slug={vacancy.slug} email={user?.email ?? ""} siteKey={turnstileSiteKey()} /> : null}
      </main>
      <SiteFooter compact />
    </>
  );
}
