import Link from "next/link";

/** Страницы входа и регистрации: мягкий светлый фон, минимальная шапка, карточка по центру. */
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="soft-page flex min-h-full flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-[1180px] items-center justify-between px-6 py-5">
        <Link href="/" className="flex items-center gap-2.5 text-[22px] font-extrabold tracking-tight text-[color:var(--soft-text)]">
          <span aria-hidden="true" className="neu-raised inline-flex h-10 w-10 items-center justify-center rounded-xl font-mono text-sm font-semibold text-[color:var(--soft-blue)]">
            &lt;/&gt;
          </span>
          <span>stackwork</span>
        </Link>
        <Link href="/" className="text-sm font-semibold text-[color:var(--soft-muted)] hover:text-[color:var(--soft-text)]">
          К вакансиям
        </Link>
      </header>
      <main className="mx-auto flex w-full max-w-[1180px] flex-1 items-start justify-center px-6 pb-16 pt-4">
        {children}
      </main>
      <footer className="mx-auto flex w-full max-w-[1180px] flex-wrap gap-4 px-6 py-5 text-xs text-[color:var(--soft-muted)]">
        <span>© 2026 stackwork</span>
        <Link href="/privacy" className="hover:text-[color:var(--soft-text)]">
          Политика обработки персональных данных
        </Link>
        <Link href="/terms" className="hover:text-[color:var(--soft-text)]">
          Пользовательское соглашение
        </Link>
      </footer>
    </div>
  );
}
