import Link from "next/link";
import { Logo } from "./logo";

export function SiteHeader() {
  return (
    <header className="bg-ink text-white">
      <div className="mx-auto flex min-h-16 max-w-[1180px] flex-wrap items-center gap-x-8 gap-y-2 px-6 py-2.5">
        <Link href="/" className="flex items-center gap-2.5 text-[22px] font-extrabold tracking-tight text-white">
          <Logo />
          <span>stackwork</span>
        </Link>
        <nav aria-label="Основное меню" className="flex flex-wrap gap-6 text-[15px] font-semibold">
          <Link href="/" className="text-[#D7DAD6] hover:text-white">
            Вакансии
          </Link>
          <Link href="/companies" className="text-[#D7DAD6] hover:text-white">
            Компании
          </Link>
          <Link href="/salaries" className="text-[#D7DAD6] hover:text-white">
            Зарплаты по стеку
          </Link>
          <Link href="/employer" className="text-[#D7DAD6] hover:text-white">
            Работодателям
          </Link>
        </nav>
        <div className="ml-auto flex flex-wrap items-center gap-3">
          <Link
            href="/employer/vacancies/new"
            className="inline-flex min-h-11 items-center rounded-lg border border-header-line px-3.5 text-sm font-semibold text-white hover:border-white"
          >
            Разместить вакансию
          </Link>
          <Link
            href="/login"
            className="inline-flex min-h-11 items-center rounded-lg bg-white px-4 text-sm font-bold text-ink hover:bg-[#EDEDEA]"
          >
            Войти
          </Link>
        </div>
      </div>
    </header>
  );
}
