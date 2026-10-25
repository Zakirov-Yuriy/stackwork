import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { plural } from "@/lib/labels";

export const metadata: Metadata = { title: "Компании", description: "Компании, которые нанимают IT-специалистов на Stackwork." };

export default async function CompaniesPage() {
  const companies = await db.company.findMany({
    where: { vacancies: { some: { status: "PUBLISHED" } } },
    include: { _count: { select: { vacancies: { where: { status: "PUBLISHED" } } } } },
    orderBy: { name: "asc" },
  });

  return (
    <>
      <SiteHeader />
      <main className="mx-auto box-border flex w-full max-w-[1180px] flex-1 flex-col gap-7 px-6 pb-14 pt-8">
        <div className="flex flex-col gap-2">
          <h1 className="m-0 text-[36px] font-extrabold leading-tight tracking-tight">Компании</h1>
          <p className="m-0 text-[16px] text-[color:var(--soft-muted)]">
            {companies.length} {plural(companies.length, "компания", "компании", "компаний")} с открытыми вакансиями
          </p>
        </div>

        {companies.length === 0 ? (
          <div className="neu-card-sm p-8">
            <p className="m-0 text-lg font-extrabold">Пока пусто</p>
            <p className="m-0 mt-1 text-sm text-[color:var(--soft-muted)]">Компании появятся, как только будут опубликованы первые вакансии.</p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {companies.map((c) => (
              <Link key={c.id} href={`/companies/${c.slug}`} className="neu-card-sm flex flex-col gap-3 p-6 text-[color:var(--soft-text)]">
                <div className="flex items-center gap-3.5">
                  <span aria-hidden="true" className="chip-blue flex h-12 w-12 flex-none items-center justify-center rounded-xl text-base font-extrabold">
                    {c.initials ?? c.name.slice(0, 2).toUpperCase()}
                  </span>
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-[17px] font-extrabold">{c.name}</span>
                    <span className="text-[13px] text-[color:var(--soft-muted)]">{[c.industry, c.city].filter(Boolean).join(" · ")}</span>
                  </div>
                </div>
                {c.description ? <p className="m-0 line-clamp-3 text-sm leading-relaxed">{c.description}</p> : null}
                <span className="soft-link mt-auto text-sm">
                  {c._count.vacancies} {plural(c._count.vacancies, "вакансия", "вакансии", "вакансий")}
                </span>
              </Link>
            ))}
          </div>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
