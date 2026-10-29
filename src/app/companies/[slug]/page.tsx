import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { db } from "@/lib/db";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { VacancyCard } from "@/components/vacancy-card";
import { CompanyAvatar } from "@/components/company-avatar";
import { vacancyCardInclude } from "@/lib/vacancies";
import { plural } from "@/lib/labels";

const loadCompany = cache((slug: string) =>
  db.company.findUnique({ where: { slug }, select: { id: true, slug: true, name: true, description: true, industry: true, city: true, website: true, logoUrl: true, initials: true, isExternal: true, claimedAt: true } }),
);

export async function generateMetadata(props: PageProps<"/companies/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const c = await loadCompany(slug);
  return { title: c ? `${c.name}: вакансии` : "Компания не найдена" };
}

export default async function CompanyPage(props: PageProps<"/companies/[slug]">) {
  const { slug } = await props.params;
  const c = await loadCompany(slug);
  if (!c) notFound();
  const vacancies = await db.vacancy.findMany({ where: { companyId: c.id, status: "PUBLISHED" }, include: vacancyCardInclude, orderBy: { publishedAt: "desc" }, take: 50 });
  const now = new Date();
  const website = c.website && /^https?:\/\//.test(c.website) ? c.website : null;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto box-border flex w-full max-w-[1180px] flex-1 flex-col gap-6 px-6 pb-12 pt-8">
        <nav aria-label="Хлебные крошки" className="flex flex-wrap items-center gap-2 text-[13px] text-muted">
          <Link href="/companies" className="hover:text-ink">
            Компании
          </Link>
          <span aria-hidden="true">/</span>
          <span className="text-ink">{c.name}</span>
        </nav>

        <section className="flex flex-wrap items-start gap-5 rounded-xl border border-line bg-card p-7">
          <CompanyAvatar name={c.name} logoUrl={c.logoUrl} initials={c.initials} size={72} rounded={14} />
          <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-2">
            <h1 className="m-0 text-[30px] font-extrabold leading-tight tracking-tight">{c.name}</h1>
            <p className="m-0 text-[15px] text-muted">
              {[c.industry, c.city].filter(Boolean).join(" · ") || "IT-компания"}
              {website ? (
                <>
                  {" · "}
                  <a href={website} target="_blank" rel="noopener" className="font-bold text-link hover:text-ink">
                    сайт
                  </a>
                </>
              ) : null}
            </p>
            {c.description ? <p className="m-0 max-w-[720px] text-[15px] leading-relaxed text-ink-2">{c.description}</p> : null}
            {c.isExternal && !c.claimedAt ? (
              <p className="m-0 mt-1 text-[13px] text-muted">
                Страница собрана из открытых источников.{" "}
                <Link href={`/companies/${c.slug}/claim`} className="font-bold text-link hover:text-ink">
                  Это ваша компания? Заберите страницу
                </Link>
                , чтобы управлять вакансиями и получать отклики.
              </p>
            ) : null}
          </div>
        </section>

        <section className="flex flex-col gap-3.5">
          <h2 className="m-0 text-xl font-extrabold">
            {vacancies.length} {plural(vacancies.length, "открытая вакансия", "открытые вакансии", "открытых вакансий")}
          </h2>
          {vacancies.map((v) => (
            <VacancyCard key={v.id} vacancy={v} now={now} from="company" />
          ))}
        </section>
      </main>
      <SiteFooter compact />
    </>
  );
}
