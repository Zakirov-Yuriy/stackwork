import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getCurrentUser } from "@/lib/session";
import { turnstileSiteKey } from "@/lib/turnstile";
import { ReportForm } from "./report-form";

export const metadata: Metadata = { title: "Пожаловаться на вакансию" };

export default async function ReportPage(props: PageProps<"/report">) {
  const sp = await props.searchParams;
  const slug = typeof sp.vacancy === "string" ? sp.vacancy : "";
  const vacancy = slug ? await db.vacancy.findUnique({ where: { slug }, select: { title: true, slug: true, company: { select: { name: true } } } }) : null;
  const user = await getCurrentUser();

  return (
    <>
      <SiteHeader />
      <main className="mx-auto box-border flex w-full max-w-[1180px] flex-1 flex-col gap-6 px-6 pb-14 pt-8">
        <div className="flex max-w-[640px] flex-col gap-2">
          <h1 className="m-0 text-[30px] font-extrabold leading-tight tracking-tight">Пожаловаться на вакансию</h1>
          {vacancy ? (
            <p className="m-0 text-[15px] text-[color:var(--soft-muted)]">
              <Link href={`/vacancies/${vacancy.slug}`} className="soft-link">
                {vacancy.title}
              </Link>{" "}
              · {vacancy.company.name}
            </p>
          ) : (
            <p className="m-0 text-[15px] text-[color:var(--soft-muted)]">Вакансия не найдена. Откройте жалобу со страницы вакансии.</p>
          )}
        </div>
        {vacancy ? <ReportForm slug={vacancy.slug} email={user?.email ?? ""} siteKey={turnstileSiteKey()} /> : null}
      </main>
      <SiteFooter compact />
    </>
  );
}
