import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { logoutAction } from "@/app/[locale]/(auth)/actions";
import type { CurrentUser } from "@/lib/session";
import { MobileMenu } from "./mobile-menu";
import { BrandMark } from "./brand-mark";
import { CompanyAvatar } from "./company-avatar";

/** Шапка кабинета работодателя: своё меню и бейдж «для работодателей». */
export async function EmployerHeader({ user, active }: { user: CurrentUser; active: "vacancies" | "responses" | "company" | "billing" }) {
  const t = await getTranslations("employer");
  const item = (key: typeof active, href: string, label: string) => (
    <Link href={href} className="neu-tab inline-flex items-center justify-center px-4" aria-current={active === key ? "page" : undefined} style={{ minHeight: 40, fontSize: 14, borderRadius: 10 }}>
      {label}
    </Link>
  );
  return (
    <header className="soft-page">
      <div className="mx-auto flex min-h-[76px] max-w-[1180px] flex-wrap items-center gap-x-6 gap-y-3 px-6 py-3">
        <Link href="/employer" className="flex items-center gap-2.5 text-[22px] font-extrabold tracking-tight text-[color:var(--soft-text)]">
          <BrandMark size={40} />
          <span>stackwork</span>
          <span className="neu-inset rounded-lg px-2.5 py-1 text-xs font-semibold tracking-[0.04em] text-[color:var(--soft-muted)]">{t("nav.badge")}</span>
        </Link>
        <MobileMenu label={t("nav.menu.label")} openLabel={t("nav.menu.open")} closeLabel={t("nav.menu.close")}>
        <nav aria-label={t("nav.label")} className="neu-tabs flex flex-wrap gap-1 self-start" style={{ padding: 4, borderRadius: 14 }}>
          {item("vacancies", "/employer", t("dashboard.title"))}
          {item("responses", "/employer/responses", t("responses.title"))}
          {item("company", "/employer/company", t("company.title"))}
          {item("billing", "/employer/billing", t("billing.title"))}
        </nav>
        <div className="flex flex-wrap items-center gap-3 md:ml-auto">
          <span className="inline-flex min-h-11 items-center gap-2.5 text-sm font-semibold text-[color:var(--soft-text)]">
            <CompanyAvatar name={user.company?.name ?? "?"} logoUrl={user.company?.logoUrl} initials={user.company?.initials ?? "?"} size={32} rounded={8} />
            <span>{user.company?.name ?? t("nav.noCompany")}</span>
          </span>
          <Link href="/" className="neu-btn-sm">
            {t("nav.toSite")}
          </Link>
          <form action={logoutAction}>
            <button type="submit" className="neu-btn-sm">
              {t("nav.logout")}
            </button>
          </form>
        </div>
        </MobileMenu>
      </div>
    </header>
  );
}

const STATUS_CLS: Record<string, string> = {
  DRAFT: "chip-flat",
  MODERATION: "rounded-lg bg-[#FFF0C2] px-2.5 py-1 text-xs font-bold text-[#7A5200]",
  PUBLISHED: "rounded-lg bg-[#DDF3E6] px-2.5 py-1 text-xs font-bold text-[#1F6F58]",
  ARCHIVED: "chip-flat opacity-70",
  REJECTED: "rounded-lg bg-[#F9E0E0] px-2.5 py-1 text-xs font-bold text-[#8A1F1F]",
};

/** Бейдж статуса вакансии; подписи в employer.status.<статус в нижнем регистре> */
export async function StatusBadge({ status }: { status: string }) {
  const t = await getTranslations("employer.status");
  const cls = STATUS_CLS[status];
  return <span className={cls ?? "chip-flat"}>{cls ? t(status.toLowerCase()) : status}</span>;
}
