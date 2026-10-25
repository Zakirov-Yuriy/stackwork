import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { db } from "@/lib/db";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { VacancyCard } from "@/components/vacancy-card";
import { vacancyCardInclude } from "@/lib/vacancies";
import { plural } from "@/lib/labels";
import { savedIdsFor } from "@/lib/saved";
import { getCurrentUser } from "@/lib/session";

const loadCompany = cache((slug: string) => db.company.findUnique({ where: { slug } }));

export async function generateMetadata(props: PageProps<"/companies/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const c = await loadCompany(slug);
  if (!c) return { title: "Компания не найдена" };
  return { title: `${c.name}: вакансии`, description: c.description ?? `Вакансии компании ${c.name} на Stackwork` };
}

export default async function CompanyPage(props: PageProps<"/companies/[slug]">) {
  const { slug } = await props.params;
  const c = await loadCompany(slug);
  if (!c) notFound();

  const vacancies = await db.vacancy.findMany({
    where: { companyId: c.id, status: "PUBLISHED" },
    include: vacancyCardInclude,
    orderBy: { publishedAt: "desc" },
  });
  const now = new Date();
  const user = await getCurrentUser();
  const saved = await savedIdsFor(user?.id, vacancies.map((v) => v.id));

  return (
    <>
      <SiteHeader />
      <main className="mx-auto box-border flex w-full max-w-[1180px] flex-1 flex-col gap-6 px-6 pb-14 pt-4">
        <nav aria-label="Хлебные крошки" className="flex flex-wrap items-center gap-2 text-[13px] text-[color:var(--soft-muted)]">
          <Link href="/companies" className="hover:text-[color:var(--soft-text)]">
            Компании
          </Link>
          <span aria-hidden="true">/</span>
          <span className="text-[color:var(--soft-text)]">{c.name}</span>
        </nav>

        <section className="neu-card flex flex-wrap items-start gap-6 p-8">
          <span aria-hidden="true" className="chip-blue flex h-16 w-16 flex-none items-center justify-center rounded-2xl text-xl font-extrabold">
            {c.initials ?? c.name.slice(0, 2).toUpperCase()}
          </span>
          <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-2">
            <h1 className="m-0 text-[32px] font-extrabold leading-tight tracking-tight">{c.name}</h1>
            <p className="m-0 text-sm text-[color:var(--soft-muted)]">{[c.industry, c.city].filter(Boolean).join(" · ")}</p>
            {c.description ? <p className="m-0 max-w-[720px] text-[15px] leading-relaxed">{c.description}</p> : null}
            {c.website ? (
              <a href={c.website} target="_blank" rel="noopener noreferrer" className="soft-link text-sm">
                {c.website.replace(/^https?:\/\/(www\.)?/, "")}
              </a>
            ) : null}
          </div>
        </section>

        <h2 className="m-0 text-xl font-extrabold">
          {vacancies.length} {plural(vacancies.length, "открытая вакансия", "открытые вакансии", "открытых вакансий")}
        </h2>
        {vacancies.length === 0 ? (
          <div className="neu-card-sm p-8 text-sm text-[color:var(--soft-muted)]">Сейчас у компании нет открытых вакансий.</div>
        ) : (
          <div className="flex flex-col gap-4">
            {vacancies.map((v) => (
              <VacancyCard key={v.id} vacancy={v} now={now} saved={saved.has(v.id)} back={`/companies/${c.slug}`} />
            ))}
          </div>
        )}
      </main>
      <SiteFooter compact />
    </>
  );
}
