import type { Metadata } from "next";
import { requireRole } from "@/lib/guards";
import { EmployerHeader } from "@/components/employer-shell";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = { title: "Тариф" };

export default async function BillingPage() {
  const user = await requireRole("EMPLOYER", "/employer/billing");
  return (
    <>
      <EmployerHeader user={user} active="billing" />
      <main className="mx-auto box-border flex w-full max-w-[1180px] flex-1 flex-col gap-6 px-6 pb-12 pt-8">
        <div className="flex flex-col gap-1.5">
          <h1 className="m-0 text-[30px] font-extrabold leading-tight tracking-tight">Тариф</h1>
          <p className="m-0 text-[15px] text-[color:var(--soft-muted)]">Текущий тариф: бесплатный.</p>
        </div>
        <div className="neu-card flex max-w-[640px] flex-col gap-3 p-7">
          <div className="flex items-center gap-3">
            <span className="chip-blue">Бесплатно</span>
            <span className="text-sm text-[color:var(--soft-muted)]">без ограничений по числу вакансий и откликов</span>
          </div>
          <p className="m-0 text-[15px] leading-relaxed">
            Пока площадка растёт, размещение бесплатное. Когда появятся платные опции, они коснутся только продвижения вакансий; базовое размещение для текущих компаний останется бесплатным.
          </p>
        </div>
      </main>
      <SiteFooter compact />
    </>
  );
}
