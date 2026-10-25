import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/guards";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { VacancyCard } from "@/components/vacancy-card";
import { vacancyCardInclude } from "@/lib/vacancies";
import { plural } from "@/lib/labels";
import { MeTabs } from "../me-tabs";

export const metadata: Metadata = { title: "Избранное" };

export default async function SavedPage() {
  const user = await requireUser("/me/saved");
  const rows = await db.savedVacancy.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: { vacancy: { include: vacancyCardInclude } },
  });
  const now = new Date();

  return (
    <>
      <SiteHeader />
      <main className="mx-auto box-border flex w-full max-w-[1180px] flex-1 flex-col gap-6 px-6 pb-12 pt-8">
        <div className="flex flex-col gap-1.5">
          <h1 className="m-0 text-[30px] font-extrabold leading-tight tracking-tight">Избранное</h1>
          <p className="m-0 text-[15px] text-[color:var(--soft-muted)]">
            {rows.length} {plural(rows.length, "вакансия", "вакансии", "вакансий")}
          </p>
        </div>
        <MeTabs active="saved" />
        {rows.length === 0 ? (
          <div className="flex flex-col items-start gap-3 neu-card-sm p-8">
            <p className="m-0 text-lg font-extrabold">Пока ничего не сохранено</p>
            <p className="m-0 text-sm text-[color:var(--soft-muted)]">Нажмите на закладку в карточке вакансии, и она появится здесь.</p>
            <Link href="/" className="neu-primary-sm mt-1">
              К вакансиям
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {rows.map((r) => (
              <div key={r.vacancyId} className={r.vacancy.status === "PUBLISHED" ? "" : "opacity-60"}>
                {r.vacancy.status !== "PUBLISHED" ? <p className="m-0 mb-1 text-xs font-semibold text-[color:var(--soft-muted)]">Вакансия снята с публикации</p> : null}
                <VacancyCard vacancy={r.vacancy} now={now} saved back="/me/saved" />
              </div>
            ))}
          </div>
        )}
      </main>
      <SiteFooter compact />
    </>
  );
}
