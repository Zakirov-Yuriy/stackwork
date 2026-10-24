import Link from "next/link";
import { Logo } from "./logo";
import { logoutAction } from "@/app/(auth)/actions";
import type { CurrentUser } from "@/lib/session";

const navLink = "text-[#D7DAD6] hover:text-white";
const navActive = "border-b-2 border-accent pb-1 text-white";

/** Шапка кабинета работодателя: отдельное меню, бейдж «для работодателей». */
export function EmployerHeader({ user, active }: { user: CurrentUser; active: "vacancies" | "responses" | "company" | "billing" }) {
  const item = (key: typeof active, href: string, label: string) => (
    <Link href={href} className={active === key ? navActive : navLink}>
      {label}
    </Link>
  );
  return (
    <header className="bg-ink text-white">
      <div className="mx-auto flex min-h-16 max-w-[1180px] flex-wrap items-center gap-x-8 gap-y-2 px-6 py-2.5">
        <Link href="/employer" className="flex items-center gap-2.5 text-[22px] font-extrabold tracking-tight text-white">
          <Logo />
          <span>stackwork</span>
          <span className="rounded-md border border-header-line px-2 py-[3px] text-xs font-semibold tracking-[0.04em] text-header-muted">
            для работодателей
          </span>
        </Link>
        <nav aria-label="Меню кабинета" className="flex flex-wrap gap-6 text-[15px] font-semibold">
          {item("vacancies", "/employer", "Мои вакансии")}
          {item("responses", "/employer/responses", "Отклики")}
          {item("company", "/employer/company", "Компания")}
          {item("billing", "/employer/billing", "Тариф")}
        </nav>
        <div className="ml-auto flex flex-wrap items-center gap-3">
          <span className="inline-flex min-h-11 items-center gap-2.5 text-sm font-semibold">
            <span
              aria-hidden="true"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white text-[13px] font-extrabold text-ink"
            >
              {user.company?.initials ?? "?"}
            </span>
            <span>{user.company?.name ?? "Компания не указана"}</span>
          </span>
          <Link
            href="/"
            className="inline-flex min-h-11 items-center rounded-lg border border-header-line px-3.5 text-sm font-semibold text-white hover:border-white"
          >
            На сайт
          </Link>
          <form action={logoutAction}>
            <button type="submit" className="inline-flex min-h-11 items-center rounded-lg bg-white px-4 text-sm font-bold text-ink hover:bg-[#EDEDEA]">
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
    DRAFT: { label: "Черновик", cls: "bg-soft text-ink-2" },
    MODERATION: { label: "На модерации", cls: "bg-[#FFF2CC] text-[#7A5200]" },
    PUBLISHED: { label: "Опубликована", cls: "bg-[#EAF7EF] text-[#1F6F58]" },
    ARCHIVED: { label: "В архиве", cls: "bg-soft text-muted" },
    REJECTED: { label: "Отклонена", cls: "bg-[#FBEDED] text-[#8A1F1F]" },
  };
  const s = map[status] ?? { label: status, cls: "bg-soft text-ink-2" };
  return <span className={`rounded-md px-2.5 py-1 text-xs font-bold ${s.cls}`}>{s.label}</span>;
}
