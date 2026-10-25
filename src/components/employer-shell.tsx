import Link from "next/link";
import { logoutAction } from "@/app/(auth)/actions";
import type { CurrentUser } from "@/lib/session";

/** Шапка кабинета работодателя: своё меню и бейдж «для работодателей». */
export function EmployerHeader({ user, active }: { user: CurrentUser; active: "vacancies" | "responses" | "company" | "billing" }) {
  const item = (key: typeof active, href: string, label: string) => (
    <Link href={href} className="neu-tab inline-flex items-center justify-center px-4" aria-current={active === key ? "page" : undefined} style={{ minHeight: 40, fontSize: 14, borderRadius: 10 }}>
      {label}
    </Link>
  );
  return (
    <header className="soft-page">
      <div className="mx-auto flex min-h-[76px] max-w-[1180px] flex-wrap items-center gap-x-6 gap-y-3 px-6 py-3">
        <Link href="/employer" className="flex items-center gap-2.5 text-[22px] font-extrabold tracking-tight text-[color:var(--soft-text)]">
          <span aria-hidden="true" className="neu-raised inline-flex h-10 w-10 items-center justify-center rounded-xl font-mono text-sm font-semibold text-[color:var(--soft-blue)]">
            &lt;/&gt;
          </span>
          <span>stackwork</span>
          <span className="neu-inset rounded-lg px-2.5 py-1 text-xs font-semibold tracking-[0.04em] text-[color:var(--soft-muted)]">для работодателей</span>
        </Link>
        <nav aria-label="Меню кабинета" className="neu-tabs flex flex-wrap gap-1" style={{ padding: 4, borderRadius: 14 }}>
          {item("vacancies", "/employer", "Мои вакансии")}
          {item("responses", "/employer/responses", "Отклики")}
          {item("company", "/employer/company", "Компания")}
          {item("billing", "/employer/billing", "Тариф")}
        </nav>
        <div className="ml-auto flex flex-wrap items-center gap-3">
          <span className="inline-flex min-h-11 items-center gap-2.5 text-sm font-semibold text-[color:var(--soft-text)]">
            <span aria-hidden="true" className="chip-blue inline-flex h-8 w-8 items-center justify-center rounded-lg text-[13px] font-extrabold">
              {user.company?.initials ?? "?"}
            </span>
            <span>{user.company?.name ?? "Компания не указана"}</span>
          </span>
          <Link href="/" className="neu-btn-sm">
            На сайт
          </Link>
          <form action={logoutAction}>
            <button type="submit" className="neu-btn-sm">
              Выйти
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    DRAFT: { label: "Черновик", cls: "chip-flat" },
    MODERATION: { label: "На модерации", cls: "rounded-lg bg-[#FFF0C2] px-2.5 py-1 text-xs font-bold text-[#7A5200]" },
    PUBLISHED: { label: "Опубликована", cls: "rounded-lg bg-[#DDF3E6] px-2.5 py-1 text-xs font-bold text-[#1F6F58]" },
    ARCHIVED: { label: "В архиве", cls: "chip-flat opacity-70" },
    REJECTED: { label: "Отклонена", cls: "rounded-lg bg-[#F9E0E0] px-2.5 py-1 text-xs font-bold text-[#8A1F1F]" },
  };
  const s = map[status] ?? { label: status, cls: "chip-flat" };
  return <span className={s.cls}>{s.label}</span>;
}
