import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = { title: "Тарифы для работодателей" };

export default function PricingPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto box-border flex w-full max-w-[1180px] flex-1 flex-col gap-7 px-6 pb-14 pt-8">
        <div className="flex max-w-[760px] flex-col gap-2">
          <h1 className="m-0 text-[36px] font-extrabold leading-tight tracking-tight">Размещение вакансий бесплатно</h1>
          <p className="m-0 text-[16px] leading-relaxed text-[color:var(--soft-muted)]">
            Пока площадка растёт, публикация вакансий и доступ к откликам не стоят ничего. Единственное условие: в вакансии указана зарплатная вилка, и она проходит ручную модерацию.
          </p>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {[
            { title: "Публикация", text: "Неограниченное число вакансий. Модерация обычно в течение одного рабочего дня." },
            { title: "Отклики", text: "Резюме, GitHub и сопроводительные письма в кабинете. Уведомления на почту." },
            { title: "Что дальше", text: "Платные тарифы появятся позже и коснутся только продвижения. Базовое размещение останется бесплатным для тех, кто пришёл раньше." },
          ].map((c) => (
            <div key={c.title} className="neu-card-sm flex flex-col gap-2 p-6">
              <h2 className="m-0 text-lg font-extrabold">{c.title}</h2>
              <p className="m-0 text-sm leading-relaxed text-[color:var(--soft-text)]">{c.text}</p>
            </div>
          ))}
        </div>
        <div>
          <Link href="/register?role=employer" className="neu-primary inline-flex items-center justify-center px-8">
            Разместить вакансию
          </Link>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
