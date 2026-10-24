import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/guards";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { APPLICATION_STATUS_LABEL, formatSalary, formatDate, formatLocation, plural } from "@/lib/labels";

export const metadata: Metadata = { title: "Мои отклики" };

const STATUS_CLS: Record<string, string> = {
  NEW: "bg-soft text-ink-2",
  VIEWED: "bg-[#E7F0FB] text-[#1F4E8A]",
  INTERVIEW: "bg-[#EAF7EF] text-[#1F6F58]",
  OFFER: "bg-accent text-ink",
  REJECTED: "bg-[#FBEDED] text-[#8A1F1F]",
};

export default async function MePage() {
  const user = await requireUser("/me");
  const applications =
    user.role === "CANDIDATE"
      ? await db.application.findMany({
          where: { candidateId: user.id },
          orderBy: { createdAt: "desc" },
          include: { vacancy: { include: { company: { select: { name: true } } } } },
        })
      : [];

  return (
    <>
      <SiteHeader />
      <main className="mx-auto box-border flex w-full max-w-[1180px] flex-1 flex-col gap-6 px-6 pb-12 pt-8">
        <div className="flex flex-col gap-1.5">
          <h1 className="m-0 text-[30px] font-extrabold leading-tight tracking-tight">Мои отклики</h1>
          <p className="m-0 text-[15px] text-muted">
            {user.name ?? user.email} · {applications.length} {plural(applications.length, "отклик", "отклика", "откликов")}
          </p>
        </div>

        {user.role !== "CANDIDATE" ? (
          <div className="rounded-xl border border-line bg-card p-8">
            <p className="m-0 text-base font-extrabold">Этот раздел для соискателей</p>
            <p className="m-0 mt-1 text-sm text-muted">
              Вы вошли как {user.role === "EMPLOYER" ? "работодатель" : "администратор"}.{" "}
              <Link href={user.role === "EMPLOYER" ? "/employer" : "/admin"} className="font-bold text-link hover:text-ink">
                Перейти в кабинет
              </Link>
            </p>
          </div>
        ) : applications.length === 0 ? (
          <div className="flex flex-col items-start gap-3 rounded-xl border border-line bg-card p-8">
            <p className="m-0 text-lg font-extrabold">Пока ни одного отклика</p>
            <p className="m-0 text-sm text-muted">Найдите вакансию по стеку и зарплате и откликнитесь: ответы работодателей будут здесь.</p>
            <Link href="/" className="mt-1 inline-flex min-h-11 items-center rounded-lg bg-ink px-4 text-sm font-bold text-white">
              К вакансиям
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {applications.map((a) => (
              <article key={a.id} className="flex flex-wrap items-center gap-4 rounded-xl border border-line bg-card px-[22px] py-4">
                <div className="flex min-w-0 flex-[1_1_360px] flex-col gap-1">
                  <Link href={`/vacancies/${a.vacancy.slug}`} className="text-[17px] font-extrabold leading-snug text-ink hover:underline">
                    {a.vacancy.title}
                  </Link>
                  <span className="text-[13px] text-muted">
                    {a.vacancy.company.name} · {formatLocation(a.vacancy.city, a.vacancy.workFormat)} ·{" "}
                    <span className="font-mono font-semibold text-ink">{formatSalary(a.vacancy.salaryFrom, a.vacancy.salaryTo, a.vacancy.currency)}</span>
                  </span>
                </div>
                <span className={`rounded-md px-2.5 py-1 text-xs font-bold ${STATUS_CLS[a.status] ?? ""}`}>{APPLICATION_STATUS_LABEL[a.status]}</span>
                <span className="text-[13px] text-muted">{formatDate(a.createdAt)}</span>
              </article>
            ))}
          </div>
        )}
      </main>
      <SiteFooter compact />
    </>
  );
}
