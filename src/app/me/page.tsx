import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/guards";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { APPLICATION_STATUS_LABEL, formatSalary, formatDate, formatLocation, plural } from "@/lib/labels";
import { VerifyBanner } from "@/components/verify-banner";
import { SuccessBanner } from "@/components/form";
import { MeTabs } from "./me-tabs";

export const metadata: Metadata = { title: "Мои отклики" };

const STATUS_CLS: Record<string, string> = {
  NEW: "chip-flat",
  VIEWED: "bg-[#E7F0FB] text-[#1F4E8A]",
  INTERVIEW: "bg-[#EAF7EF] text-[#1F6F58]",
  OFFER: "chip-blue",
  REJECTED: "bg-[#FBEDED] text-[#8A1F1F]",
};

export default async function MePage(props: PageProps<"/me">) {
  const user = await requireUser("/me");
  const sp = await props.searchParams;
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
        <VerifyBanner user={user} what="нельзя откликаться на вакансии" />
        <SuccessBanner message={sp.verify === "ok" ? "Почта подтверждена." : sp.reset === "1" ? "Пароль изменён." : undefined} />
        <div className="flex flex-col gap-1.5">
          <h1 className="m-0 text-[30px] font-extrabold leading-tight tracking-tight">Мои отклики</h1>
          <p className="m-0 text-[15px] text-[color:var(--soft-muted)]">
            {user.name ?? user.email} · {applications.length} {plural(applications.length, "отклик", "отклика", "откликов")}
          </p>
        </div>
        {user.role === "CANDIDATE" ? <MeTabs active="applications" /> : null}

        {user.role !== "CANDIDATE" ? (
          <div className="neu-card-sm p-8">
            <p className="m-0 text-base font-extrabold">Этот раздел для соискателей</p>
            <p className="m-0 mt-1 text-sm text-[color:var(--soft-muted)]">
              Вы вошли как {user.role === "EMPLOYER" ? "работодатель" : "администратор"}.{" "}
              <Link href={user.role === "EMPLOYER" ? "/employer" : "/admin"} className="soft-link">
                Перейти в кабинет
              </Link>
            </p>
          </div>
        ) : applications.length === 0 ? (
          <div className="flex flex-col items-start gap-3 neu-card-sm p-8">
            <p className="m-0 text-lg font-extrabold">Пока ни одного отклика</p>
            <p className="m-0 text-sm text-[color:var(--soft-muted)]">Найдите вакансию по стеку и зарплате и откликнитесь: ответы работодателей будут здесь.</p>
            <Link href="/" className="neu-primary-sm mt-1">
              К вакансиям
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {applications.map((a) => (
              <article key={a.id} className="flex flex-wrap items-center gap-4 neu-card-sm px-[22px] py-4">
                <div className="flex min-w-0 flex-[1_1_360px] flex-col gap-1">
                  <Link href={`/vacancies/${a.vacancy.slug}`} className="text-[17px] font-extrabold leading-snug text-[color:var(--soft-text)] hover:underline">
                    {a.vacancy.title}
                  </Link>
                  <span className="text-[13px] text-[color:var(--soft-muted)]">
                    {a.vacancy.company.name} · {formatLocation(a.vacancy.city, a.vacancy.workFormat)} ·{" "}
                    <span className="font-mono font-semibold text-[color:var(--soft-text)]">{formatSalary(a.vacancy.salaryFrom, a.vacancy.salaryTo, a.vacancy.currency)}</span>
                  </span>
                </div>
                <span className={STATUS_CLS[a.status] ?? "chip-flat"}>{APPLICATION_STATUS_LABEL[a.status]}</span>
                <span className="text-[13px] text-[color:var(--soft-muted)]">{formatDate(a.createdAt)}</span>
              </article>
            ))}
          </div>
        )}
      </main>
      <SiteFooter compact />
    </>
  );
}
