import Link from "next/link";
import { Logo } from "./logo";
import { getCurrentUser } from "@/lib/session";
import { logoutAction } from "@/app/(auth)/actions";

const navLink = "text-[#D7DAD6] hover:text-white";
const outlineBtn =
  "inline-flex min-h-11 items-center rounded-lg border border-header-line px-3.5 text-sm font-semibold text-white hover:border-white";
const whiteBtn = "inline-flex min-h-11 items-center rounded-lg bg-white px-4 text-sm font-bold text-ink hover:bg-[#EDEDEA]";

export async function SiteHeader() {
  const user = await getCurrentUser();
  const cabinet = user?.role === "EMPLOYER" ? "/employer" : user?.role === "ADMIN" ? "/admin" : "/me";

  return (
    <header className="bg-ink text-white">
      <div className="mx-auto flex min-h-16 max-w-[1180px] flex-wrap items-center gap-x-8 gap-y-2 px-6 py-2.5">
        <Link href="/" className="flex items-center gap-2.5 text-[22px] font-extrabold tracking-tight text-white">
          <Logo />
          <span>stackwork</span>
        </Link>
        <nav aria-label="Основное меню" className="flex flex-wrap gap-6 text-[15px] font-semibold">
          <Link href="/" className={navLink}>
            Вакансии
          </Link>
          <Link href="/companies" className={navLink}>
            Компании
          </Link>
          <Link href="/salaries" className={navLink}>
            Зарплаты по стеку
          </Link>
          <Link href="/employer" className={navLink}>
            Работодателям
          </Link>
        </nav>
        <div className="ml-auto flex flex-wrap items-center gap-3">
          {user ? (
            <>
              <Link href={cabinet} className={outlineBtn}>
                {user.role === "EMPLOYER" ? (user.company?.name ?? "Кабинет") : user.role === "ADMIN" ? "Админка" : "Мои отклики"}
              </Link>
              <span className="text-sm font-semibold text-header-muted">{user.name ?? user.email}</span>
              <form action={logoutAction}>
                <button type="submit" className={whiteBtn}>
                  Выйти
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/register?role=employer" className={outlineBtn}>
                Разместить вакансию
              </Link>
              <Link href="/login" className={whiteBtn}>
                Войти
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
