import Link from "next/link";

const linkCls = "text-[color:var(--soft-muted)] hover:text-[color:var(--soft-text)]";
const headCls = "text-[13px] font-extrabold uppercase tracking-[0.06em] text-[color:var(--soft-text)]";

function Brand({ size = "md" }: { size?: "md" | "sm" }) {
  return (
    <div className={`flex items-center gap-2 font-extrabold text-[color:var(--soft-text)] ${size === "sm" ? "text-base" : "text-lg"}`}>
      <span aria-hidden="true" className="neu-raised inline-flex h-8 w-8 items-center justify-center rounded-lg font-mono text-xs font-semibold text-[color:var(--soft-blue)]">
        &lt;/&gt;
      </span>
      <span>stackwork</span>
    </div>
  );
}

export function SiteFooter({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <footer className="mt-auto">
        <div className="mx-auto max-w-[1180px] px-6">
          <div className="soft-divider" />
        </div>
        <div className="mx-auto flex max-w-[1180px] flex-wrap items-center gap-5 px-6 py-5 text-[13px]">
          <Brand size="sm" />
          <Link href="/privacy" className={linkCls}>
            Политика обработки персональных данных
          </Link>
          <Link href="/terms" className={linkCls}>
            Пользовательское соглашение
          </Link>
          <span className="ml-auto text-[color:var(--soft-muted)]">© 2026 stackwork · [РЕКВИЗИТЫ ОПЕРАТОРА ПЕРСОНАЛЬНЫХ ДАННЫХ]</span>
        </div>
      </footer>
    );
  }

  return (
    <footer className="mt-auto">
      <div className="mx-auto max-w-[1180px] px-6">
        <div className="soft-divider" />
      </div>
      <div className="mx-auto flex max-w-[1180px] flex-wrap gap-8 px-6 py-9 text-sm">
        <div className="flex flex-[2_1_240px] flex-col gap-3">
          <Brand />
          <p className="m-0 max-w-[320px] leading-relaxed text-[color:var(--soft-muted)]">
            Площадка IT-вакансий с указанной зарплатой. Для разработчиков и тех, кто их ищет.
          </p>
        </div>
        <div className="flex flex-[1_1_160px] flex-col gap-2.5">
          <strong className={headCls}>Соискателям</strong>
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
          <strong className={headCls}>Работодателям</strong>
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
          <strong className={headCls}>Документы</strong>
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
      <div className="mx-auto flex max-w-[1180px] flex-wrap gap-4 px-6 pb-6 text-xs text-[color:var(--soft-muted)]">
        <span>© 2026 stackwork</span>
        <span>[РЕКВИЗИТЫ ОПЕРАТОРА ПЕРСОНАЛЬНЫХ ДАННЫХ]</span>
      </div>
    </footer>
  );
}
