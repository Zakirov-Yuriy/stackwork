import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { logoutAction } from "@/app/(auth)/actions";

const navLink = "text-[color:var(--soft-muted)] hover:text-[color:var(--soft-text)]";

export async function SiteHeader() {
  const user = await getCurrentUser();
  const cabinet = user?.role === "EMPLOYER" ? "/employer" : user?.role === "ADMIN" ? "/admin" : "/me";

  return (
    <header className="soft-page">
      <div className="mx-auto flex min-h-[76px] max-w-[1180px] flex-wrap items-center gap-x-8 gap-y-3 px-6 py-3">
        <Link href="/" className="flex items-center gap-2.5 text-[22px] font-extrabold tracking-tight text-[color:var(--soft-text)]">
          <span aria-hidden="true" className="neu-raised inline-flex h-10 w-10 items-center justify-center rounded-xl font-mono text-sm font-semibold text-[color:var(--soft-blue)]">
            &lt;/&gt;
          </span>
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
              <Link href={cabinet} className="neu-btn-sm">
                {user.role === "EMPLOYER" ? (user.company?.name ?? "Кабинет") : user.role === "ADMIN" ? "Модерация" : "Мои отклики"}
              </Link>
              <span className="text-sm font-semibold text-[color:var(--soft-muted)]">{user.name ?? user.email}</span>
              <form action={logoutAction}>
                <button type="submit" className="neu-btn-sm">
                  Выйти
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/register?role=employer" className="neu-btn-sm">
                Разместить вакансию
              </Link>
              <Link href="/login" className="neu-primary-sm">
                Войти
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
