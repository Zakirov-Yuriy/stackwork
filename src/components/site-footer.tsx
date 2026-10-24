import Link from "next/link";
import { Logo } from "./logo";

const linkCls = "text-muted hover:text-ink";

export function SiteFooter({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <footer className="mt-auto border-t border-line bg-card">
        <div className="mx-auto flex max-w-[1180px] flex-wrap items-center gap-5 px-6 py-5 text-[13px]">
          <div className="flex items-center gap-2 text-base font-extrabold">
            <Logo size="sm" />
            <span>stackwork</span>
          </div>
          <Link href="/privacy" className={linkCls}>
            Политика обработки персональных данных
          </Link>
          <Link href="/terms" className={linkCls}>
            Пользовательское соглашение
          </Link>
          <span className="ml-auto text-muted-2">© 2026 stackwork · [РЕКВИЗИТЫ ОПЕРАТОРА ПЕРСОНАЛЬНЫХ ДАННЫХ]</span>
        </div>
      </footer>
    );
  }

  return (
    <footer className="mt-auto border-t border-line bg-card">
      <div className="mx-auto flex max-w-[1180px] flex-wrap gap-8 px-6 py-8 text-sm">
        <div className="flex flex-[2_1_240px] flex-col gap-2.5">
          <div className="flex items-center gap-2 text-lg font-extrabold">
            <Logo size="sm" />
            <span>stackwork</span>
          </div>
          <p className="max-w-[320px] leading-relaxed text-muted">
            Площадка IT-вакансий с указанной зарплатой. Для разработчиков и тех, кто их ищет.
          </p>
        </div>
        <div className="flex flex-[1_1_160px] flex-col gap-2.5">
          <strong className="text-[13px] uppercase tracking-[0.06em]">Соискателям</strong>
          <Link href="/" className={linkCls}>
            Вакансии
          </Link>
          <Link href="/resume" className={linkCls}>
            Создать резюме
          </Link>
          <Link href="/salaries" className={linkCls}>
            Зарплаты по стеку
          </Link>
          <Link href="/companies" className={linkCls}>
            Компании
          </Link>
        </div>
        <div className="flex flex-[1_1_160px] flex-col gap-2.5">
          <strong className="text-[13px] uppercase tracking-[0.06em]">Работодателям</strong>
          <Link href="/employer/vacancies/new" className={linkCls}>
            Разместить вакансию
          </Link>
          <Link href="/pricing" className={linkCls}>
            Тарифы
          </Link>
          <Link href="/employer" className={linkCls}>
            Кабинет
          </Link>
        </div>
        <div className="flex flex-[1_1_200px] flex-col gap-2.5">
          <strong className="text-[13px] uppercase tracking-[0.06em]">Документы</strong>
          <Link href="/privacy" className={linkCls}>
            Политика обработки персональных данных
          </Link>
          <Link href="/consent" className={linkCls}>
            Согласие на обработку данных
          </Link>
          <Link href="/terms" className={linkCls}>
            Пользовательское соглашение
          </Link>
        </div>
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-[1180px] flex-wrap gap-4 px-6 py-4 text-xs text-muted-2">
          <span>© 2026 stackwork</span>
          <span>[РЕКВИЗИТЫ ОПЕРАТОРА ПЕРСОНАЛЬНЫХ ДАННЫХ]</span>
        </div>
      </div>
    </footer>
  );
}
