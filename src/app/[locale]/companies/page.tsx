import type { Metadata } from "next";
import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { languageAlternates } from "@/i18n/seo";
import type { Locale } from "@/i18n/routing";
import { db } from "@/lib/db";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { makeLabels } from "@/lib/labels";
import { CompanyAvatar } from "@/components/company-avatar";

export async function generateMetadata(): Promise<Metadata> {
  const [t, locale] = await Promise.all([getTranslations("company.list"), getLocale()]);
  return { title: t("title"), description: t("description"), alternates: languageAlternates("/companies", locale) };
}

export default async function CompaniesPage() {
  const [t, locale] = await Promise.all([getTranslations("company.list"), getLocale()]);
  const L = makeLabels(locale as Locale);
  const companies = await db.company.findMany({
    where: { vacancies: { some: { status: "PUBLISHED" } } },
    include: { _count: { select: { vacancies: { where: { status: "PUBLISHED" } } } } },
    orderBy: [{ vacancies: { _count: "desc" } }, { name: "asc" }],
    take: 300,
  });

  return (
    <>
      <SiteHeader />
      <main className="mx-auto box-border flex w-full max-w-[1180px] flex-1 flex-col gap-7 px-6 pb-14 pt-8">
        <div className="flex flex-col gap-2">
          <h1 className="m-0 text-[36px] font-extrabold leading-tight tracking-tight">{t("title")}</h1>
          <p className="m-0 text-[16px] text-[color:var(--soft-muted)]">{t("count", { count: companies.length })}</p>
        </div>

        {companies.length === 0 ? (
          <div className="neu-card-sm p-8">
            <p className="m-0 text-lg font-extrabold">{t("emptyTitle")}</p>
            <p className="m-0 mt-1 text-sm text-[color:var(--soft-muted)]">{t("emptyText")}</p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {companies.map((c) => (
              <Link key={c.id} href={`/companies/${c.slug}`} className="neu-card-sm flex flex-col gap-3 p-6 text-[color:var(--soft-text)]">
                <div className="flex items-center gap-3.5">
                  <CompanyAvatar name={c.name} logoUrl={c.logoUrl} initials={c.initials} size={48} rounded={12} />
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-[17px] font-extrabold">{c.name}</span>
                    <span className="text-[13px] text-[color:var(--soft-muted)]">{[c.industry, c.city].filter(Boolean).join(" · ")}</span>
                  </div>
                </div>
                {c.description ? <p className="m-0 line-clamp-3 text-sm leading-relaxed">{c.description}</p> : null}
                <span className="soft-link mt-auto text-sm">{L.formatVacancyCount(c._count.vacancies)}</span>
              </Link>
            ))}
          </div>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
