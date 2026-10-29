"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useSyncExternalStore, type ReactNode } from "react";
import {
  BarChart3,
  Briefcase,
  Building2,
  ChevronLeft,
  Download,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Settings,
  ShieldCheck,
  Sun,
  Users,
  ExternalLink,
} from "lucide-react";
import { Logo } from "@/components/logo";

export type AdminBadges = { moderation: number; claims: number; running: boolean };

type Item = { href: string; label: string; icon: ReactNode; badge?: number; dot?: boolean };

function menu(b: AdminBadges): Array<{ header?: string; items: Item[] }> {
  return [
    {
      items: [
        { href: "/admin", label: "Главная", icon: <LayoutDashboard size={18} /> },
        { href: "/admin/stats", label: "Статистика", icon: <BarChart3 size={18} /> },
      ],
    },
    {
      header: "Вакансии",
      items: [
        { href: "/admin/vacancies", label: "Все вакансии", icon: <Briefcase size={18} /> },
        { href: "/admin/moderation", label: "Модерация", icon: <ShieldCheck size={18} />, badge: b.moderation },
        { href: "/admin/import", label: "Импорт", icon: <Download size={18} />, dot: b.running },
      ],
    },
    {
      header: "Люди",
      items: [
        { href: "/admin/companies", label: "Компании", icon: <Building2 size={18} />, badge: b.claims },
        { href: "/admin/users", label: "Пользователи", icon: <Users size={18} /> },
      ],
    },
    {
      header: "Система",
      items: [{ href: "/admin/settings", label: "Настройки", icon: <Settings size={18} /> }],
    },
  ];
}

/* Тема живёт в атрибуте html[data-admin-theme]; подписываемся на его изменения */
function subscribeTheme(cb: () => void) {
  const observer = new MutationObserver(cb);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-admin-theme"] });
  return () => observer.disconnect();
}
const isDarkNow = () => document.documentElement.dataset.adminTheme === "dark";

function useTheme() {
  const dark = useSyncExternalStore(subscribeTheme, isDarkNow, () => false);
  const toggle = () => {
    const next = !dark;
    document.documentElement.dataset.adminTheme = next ? "dark" : "light";
    try {
      localStorage.setItem("admin-theme", next ? "dark" : "light");
    } catch {}
  };
  return { dark, toggle };
}

export function AdminShell({
  user,
  badges,
  logout,
  children,
}: {
  user: { name: string | null; email: string };
  badges: AdminBadges;
  logout: () => Promise<void>;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { dark, toggle } = useTheme();

  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));

  return (
    <div className="admin flex min-h-screen">
      {/* Левое меню */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[260px] flex-col bg-[var(--a-menu)] shadow-[var(--a-shadow)] transition-transform xl:static xl:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex h-16 items-center gap-2.5 px-6">
          <Link href="/admin" className="flex items-center gap-2.5 text-lg font-extrabold text-[var(--a-heading)]">
            <Logo size="sm" />
            <span>stackwork</span>
          </Link>
          <button type="button" aria-label="Скрыть меню" onClick={() => setOpen(false)} className="ml-auto rounded p-1 hover:bg-[var(--a-hover)] xl:hidden">
            <ChevronLeft size={20} />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto py-2">
          {menu(badges).map((group, gi) => (
            <div key={gi}>
              {group.header ? <div className="a-menu-header">{group.header}</div> : null}
              {group.items.map((it) => (
                <Link key={it.href} href={it.href} className="a-menu-item" aria-current={isActive(it.href) ? "page" : undefined} onClick={() => setOpen(false)}>
                  {it.icon}
                  <span>{it.label}</span>
                  {it.badge ? (
                    <span className="ml-auto rounded-full bg-[var(--a-danger)] px-2 py-0.5 text-[11px] font-bold text-white">{it.badge}</span>
                  ) : null}
                  {it.dot ? <span className="ml-auto h-2 w-2 animate-pulse rounded-full bg-[var(--a-info)]" aria-label="импорт идёт" /> : null}
                </Link>
              ))}
            </div>
          ))}
        </nav>
        <div className="px-6 py-4 text-xs text-[var(--a-muted)]">
          <Link href="/" className="inline-flex items-center gap-1 hover:text-[var(--a-heading)]">
            <ExternalLink size={14} /> На сайт
          </Link>
        </div>
      </aside>
      {open ? <button type="button" aria-label="Закрыть меню" onClick={() => setOpen(false)} className="fixed inset-0 z-30 bg-black/40 xl:hidden" /> : null}

      {/* Контент */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 mx-4 mt-4 flex h-14 items-center gap-3 rounded-lg bg-[var(--a-card)] px-4 shadow-[var(--a-shadow)] xl:mx-6">
          <button type="button" aria-label="Меню" onClick={() => setOpen(true)} className="rounded p-1 hover:bg-[var(--a-hover)] xl:hidden">
            <Menu size={22} />
          </button>
          <span className="text-sm text-[var(--a-muted)]">Админка Stackwork</span>
          <div className="ml-auto flex items-center gap-1">
            <button type="button" onClick={toggle} aria-label="Сменить тему" title="Сменить тему" className="rounded-full p-2 hover:bg-[var(--a-hover)]">
              {dark ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <details className="relative">
              <summary className="flex cursor-pointer list-none items-center gap-2 rounded-full p-1 hover:bg-[var(--a-hover)]">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--a-primary-soft)] text-sm font-bold text-[var(--a-primary-text)]">
                  {(user.name ?? user.email).slice(0, 1).toUpperCase()}
                </span>
              </summary>
              <div className="absolute right-0 mt-2 w-60 rounded-lg bg-[var(--a-card)] p-2 shadow-[var(--a-shadow)]">
                <div className="px-3 py-2">
                  <div className="text-sm font-semibold text-[var(--a-heading)]">{user.name ?? "Администратор"}</div>
                  <div className="truncate text-xs text-[var(--a-muted)]">{user.email}</div>
                </div>
                <div className="my-1 border-t border-[var(--a-line-soft)]" />
                <form action={logout}>
                  <button type="submit" className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm hover:bg-[var(--a-hover)]">
                    <LogOut size={16} /> Выйти
                  </button>
                </form>
              </div>
            </details>
          </div>
        </header>
        <main className="flex-1 px-4 py-6 xl:px-6">{children}</main>
        <footer className="px-6 pb-4 text-xs text-[var(--a-muted)]">© {new Date().getFullYear()} stackwork</footer>
      </div>
    </div>
  );
}
