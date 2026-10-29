import Link from "next/link";
import type { ReactNode } from "react";

/* Примитивы админки в духе Sneat: карточки, счётчики, бейджи, кнопки, таблицы. */

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-col gap-1">
        <h1 className="m-0 text-[22px] font-semibold leading-tight">{title}</h1>
        {subtitle ? <p className="m-0 text-sm">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function Card({ title, children, actions, className = "", padded = true }: { title?: ReactNode; children: ReactNode; actions?: ReactNode; className?: string; padded?: boolean }) {
  return (
    <section className={`a-card flex flex-col ${className}`}>
      {title || actions ? (
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 pt-5 pb-3">
          {title ? <h2 className="m-0 text-[17px] font-semibold">{title}</h2> : <span />}
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
      ) : null}
      <div className={padded ? "px-6 pb-6" : ""}>{children}</div>
    </section>
  );
}

type Tone = "primary" | "success" | "warning" | "danger" | "info" | "secondary";

const TONE_BG: Record<Tone, string> = {
  primary: "bg-[var(--a-primary-soft)] text-[var(--a-primary-text)]",
  success: "bg-[var(--a-success-soft)] text-[#56ca00]",
  warning: "bg-[var(--a-warning-soft)] text-[#d99500]",
  danger: "bg-[var(--a-danger-soft)] text-[var(--a-danger)]",
  info: "bg-[var(--a-info-soft)] text-[#03a9d1]",
  secondary: "bg-[var(--a-secondary-soft)] text-[var(--a-text)]",
};

export function StatCard({
  icon,
  label,
  value,
  hint,
  href,
  tone = "primary",
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  href?: string;
  tone?: Tone;
}) {
  return (
    <div className="a-card flex min-w-0 flex-col gap-2 p-5">
      <span className={`inline-flex h-10 w-10 items-center justify-center rounded-md ${TONE_BG[tone]}`}>{icon}</span>
      <span className="mt-1 text-sm">{label}</span>
      <span className="text-[26px] font-semibold leading-none text-[var(--a-heading)]">{value}</span>
      {hint ? <span className="text-xs text-[var(--a-muted)]">{hint}</span> : null}
      {href ? (
        <Link href={href} className="a-link mt-1 text-xs font-medium">
          Открыть раздел
        </Link>
      ) : null}
    </div>
  );
}

export function Badge({ tone = "secondary", children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold ${TONE_BG[tone]}`}>{children}</span>;
}

export function StatusBadgeAdmin({ status }: { status: string }) {
  const map: Record<string, { label: string; tone: Tone }> = {
    DRAFT: { label: "Черновик", tone: "secondary" },
    MODERATION: { label: "На модерации", tone: "warning" },
    PUBLISHED: { label: "Опубликована", tone: "success" },
    ARCHIVED: { label: "В архиве", tone: "secondary" },
    REJECTED: { label: "Скрыта", tone: "danger" },
    RUNNING: { label: "Идёт", tone: "info" },
    OK: { label: "Готово", tone: "success" },
    ERROR: { label: "Ошибка", tone: "danger" },
    PENDING: { label: "Ожидает", tone: "warning" },
    APPROVED: { label: "Одобрена", tone: "success" },
    NEW: { label: "Новый", tone: "info" },
  };
  const s = map[status] ?? { label: status, tone: "secondary" as Tone };
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

const BTN: Record<"primary" | "outline" | "danger" | "ghost", string> = {
  primary: "bg-[var(--a-primary)] text-white hover:brightness-110 shadow-[0_2px_4px_rgba(105,108,255,0.4)]",
  outline: "border border-[var(--a-primary)] text-[var(--a-primary-text)] hover:bg-[var(--a-primary-soft)]",
  danger: "border border-[var(--a-danger)] text-[var(--a-danger)] hover:bg-[var(--a-danger-soft)]",
  ghost: "border border-[var(--a-line)] text-[var(--a-text)] hover:bg-[var(--a-hover)]",
};

export function btn(variant: keyof typeof BTN = "primary", size: "sm" | "md" = "md") {
  const sz = size === "sm" ? "min-h-8 px-3 text-xs" : "min-h-10 px-4 text-sm";
  return `inline-flex items-center justify-center gap-1.5 rounded-md font-medium whitespace-nowrap disabled:opacity-60 ${sz} ${BTN[variant]}`;
}

export function LinkButton({ href, variant = "primary", size = "md", children }: { href: string; variant?: keyof typeof BTN; size?: "sm" | "md"; children: ReactNode }) {
  return (
    <Link href={href} className={btn(variant, size)}>
      {children}
    </Link>
  );
}

export function Table({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="a-table">{children}</table>
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="m-0 px-6 py-8 text-center text-sm text-[var(--a-muted)]">{children}</p>;
}

/** Горизонтальные полоски, как блок «bars» в статистике ИКАН */
export function Bars({ rows, empty }: { rows: Array<{ label: string; value: number }>; empty: string }) {
  const max = Math.max(0, ...rows.map((r) => r.value));
  if (!rows.length || max === 0) return <p className="m-0 text-sm text-[var(--a-muted)]">{empty}</p>;
  const nf = new Intl.NumberFormat("ru-RU");
  return (
    <ul className="m-0 flex list-none flex-col gap-3 p-0">
      {rows.map((r) => (
        <li key={r.label} className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="truncate text-[var(--a-heading)]">{r.label}</span>
            <span className="font-semibold">{nf.format(r.value)}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded bg-[var(--a-line-soft)]">
            <div className="h-full rounded bg-[var(--a-primary)]" style={{ width: `${Math.max(2, (r.value / max) * 100)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function Pagination({ page, pages, href }: { page: number; pages: number; href: (p: number) => string }) {
  if (pages <= 1) return null;
  const items = Array.from({ length: pages }, (_, i) => i + 1).filter((n) => n <= 2 || n > pages - 2 || Math.abs(n - page) <= 1);
  return (
    <nav aria-label="Страницы" className="flex flex-wrap items-center gap-1 px-6 py-4">
      {items.map((n, i) => {
        const prev = items[i - 1];
        const gap = prev !== undefined && n - prev > 1;
        const active = n === page;
        return (
          <span key={n} className="contents">
            {gap ? <span className="px-1 text-[var(--a-muted)]">…</span> : null}
            <Link
              href={href(n)}
              aria-current={active ? "page" : undefined}
              className={`inline-flex h-8 min-w-8 items-center justify-center rounded px-2 text-sm ${active ? "bg-[var(--a-primary)] font-semibold text-white" : "hover:bg-[var(--a-hover)]"}`}
            >
              {n}
            </Link>
          </span>
        );
      })}
    </nav>
  );
}

export const nf = new Intl.NumberFormat("ru-RU");
export const pct = (v: number | null) => (v === null ? "–" : `${v.toFixed(1).replace(/\.0$/, "").replace(".", ",")}%`);
export function dateTime(d: Date | null | undefined) {
  if (!d) return "–";
  return new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Moscow" }).format(d);
}
export function dateShort(d: Date | null | undefined) {
  if (!d) return "–";
  return new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Moscow" }).format(d);
}
