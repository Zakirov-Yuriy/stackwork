import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { CompanyAvatar } from "@/components/company-avatar";
import { plural } from "@/lib/labels";

export const metadata: Metadata = { title: "Компании", description: "Компании с открытыми IT-вакансиями на Stackwork." };

export default async function CompaniesPage(props: PageProps<"/companies">) {
  const sp = await props.searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const companies = await db.company.findMany({
    where: { vacancies: { some: { status: "PUBLISHED" } }, ...(q ? { name: { contains: q, mode: "insensitive" } } : {}) },
    orderBy: [{ vacancies: { _count: "desc" } }, { name: "asc" }],
    take: 120,
    select: { id: true, slug: true, name: true, logoUrl: true, initials: true, industry: true, city: true, _count: { select: { vacancies: { where: { status: "PUBLISHED" } } } } },
  });

  return (
    <>
      <SiteHeader />
      <main className="mx-auto box-border flex w-full max-w-[1180px] flex-1 flex-col gap-6 px-6 pb-12 pt-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <h1 className="m-0 text-[32px] font-extrabold leading-tight tracking-tight">Компании</h1>
            <p className="m-0 text-[15px] text-muted">Кто сейчас нанимает. {companies.length} {plural(companies.length, "компания", "компании", "компаний")} с открытыми вакансиями.</p>
          </div>
          <form method="get" className="flex gap-2">
            <input name="q" defaultValue={q} placeholder="Название компании" className="box-border min-h-11 w-64 rounded-lg border border-line-2 bg-card px-3 text-[15px] outline-none focus:border-ink" />
            <button type="submit" className="min-h-11 rounded-lg bg-ink px-4 text-sm font-bold text-white">
              Найти
            </button>
          </form>
        </div>

        {companies.length === 0 ? (
          <div className="rounded-xl border border-line bg-card px-6 py-10 text-center">
            <p className="m-0 text-lg font-extrabold">Ничего не нашлось</p>
          </div>
        ) : (
          <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3">
            {companies.map((c) => (
              <li key={c.id}>
                <Link href={`/companies/${c.slug}`} className="flex h-full items-center gap-3.5 rounded-xl border border-line bg-card p-4 text-ink hover:border-ink">
                  <CompanyAvatar name={c.name} logoUrl={c.logoUrl} initials={c.initials} size={48} />
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="truncate text-[16px] font-extrabold">{c.name}</span>
                    <span className="text-[13px] text-muted">
                      {c._count.vacancies} {plural(c._count.vacancies, "вакансия", "вакансии", "вакансий")}
                      {c.industry || c.city ? ` · ${[c.industry, c.city].filter(Boolean).join(", ")}` : ""}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
      <SiteFooter compact />
    </>
  );
}
