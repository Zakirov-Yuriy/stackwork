import type { Metadata } from "next";
import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { languageAlternates } from "@/i18n/seo";
import type { Locale } from "@/i18n/routing";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { makeLabels } from "@/lib/labels";
import { listLandingSkills, MIN_JOBS } from "@/lib/landing";

/** Каталог технологий: ссылки на все посадочные страницы, чтобы поисковики их находили */
export async function generateMetadata(): Promise<Metadata> {
  const [t, locale] = await Promise.all([getTranslations("jobs"), getLocale()]);
  return { title: t("index.title"), description: t("index.description"), alternates: languageAlternates("/jobs", locale) };
}

export default async function JobsIndexPage() {
  const [t, locale, skills] = await Promise.all([getTranslations("jobs"), getLocale() as Promise<Locale>, listLandingSkills()]);
  const L = makeLabels(locale);
  const muted = "text-[color:var(--soft-muted)]";
  return (
    <>
      <SiteHeader />
      <main className="mx-auto box-border flex w-full max-w-[1180px] flex-1 flex-col gap-7 px-6 pb-14 pt-8">
        <div className="flex max-w-[760px] flex-col gap-2">
          <h1 className="m-0 text-[36px] font-extrabold leading-tight tracking-tight">{t("index.title")}</h1>
          <p className={`m-0 text-[16px] leading-relaxed ${muted}`}>{t("index.lead")}</p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {skills.map((s) => (
            <div key={s.slug} className="neu-card-sm flex items-center gap-3 px-5 py-4">
              <Link href={`/jobs/${s.slug}`} className="min-w-0 flex-1 font-mono text-[15px] font-semibold text-[color:var(--soft-text)] hover:text-[color:var(--soft-blue)]">
                {s.name}
              </Link>
              <span className={`text-sm ${muted}`}>{L.formatVacancyCount(s.total)}</span>
              {s.remote >= MIN_JOBS ? (
                <Link href={`/jobs/${s.slug}/remote`} className={`text-[13px] font-semibold ${muted} hover:text-[color:var(--soft-text)]`}>
                  {t("index.remote")} {s.remote}
                </Link>
              ) : null}
            </div>
          ))}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
