import { getTranslations } from "next-intl/server";
import NextLink from "next/link";
import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/session";
import { logoutAction } from "@/app/[locale]/(auth)/actions";
import { BrandMark } from "@/components/brand-mark";
import { MobileMenu } from "./mobile-menu";
import { LocaleSwitcher } from "./locale-switcher";

const navLink = "text-[color:var(--soft-muted)] hover:text-[color:var(--soft-text)]";

export async function SiteHeader() {
  const [user, t] = await Promise.all([getCurrentUser(), getTranslations("common")]);
  const cabinet = user?.role === "EMPLOYER" ? "/employer" : "/me";

  return (
    <header className="soft-page">
      <div className="mx-auto flex min-h-[76px] max-w-[1180px] flex-wrap items-center gap-x-8 gap-y-3 px-6 py-3">
        <Link href="/" className="flex items-center gap-2.5 text-[22px] font-extrabold tracking-tight text-[color:var(--soft-text)]">
          <BrandMark size={40} />
          <span>stackwork</span>
        </Link>

        <MobileMenu label={t("menu.label")} openLabel={t("menu.open")} closeLabel={t("menu.close")}>
          <nav aria-label={t("nav.label")} className="flex flex-col gap-3 text-[15px] font-semibold md:flex-row md:flex-wrap md:gap-6">
            <Link href="/" className={navLink}>
              {t("nav.vacancies")}
            </Link>
            <Link href="/companies" className={navLink}>
              {t("nav.companies")}
            </Link>
            <Link href="/salaries" className={navLink}>
              {t("nav.salaries")}
            </Link>
            <Link href="/employer" className={navLink}>
              {t("nav.employers")}
            </Link>
          </nav>
          <div className="flex flex-wrap items-center gap-3 md:ml-auto">
            <LocaleSwitcher />
            {user ? (
              <>
                {user.role === "ADMIN" ? (
                  // Админка вне языковых маршрутов: ссылка без префикса /en
                  <NextLink href="/admin" className="neu-btn-sm">
                    {t("nav.admin")}
                  </NextLink>
                ) : (
                  <Link href={cabinet} className="neu-btn-sm">
                    {user.role === "EMPLOYER" ? (user.company?.name ?? t("nav.cabinet")) : t("nav.myResponses")}
                  </Link>
                )}
                <span className="text-sm font-semibold text-[color:var(--soft-muted)]">{user.name ?? user.email}</span>
                <form action={logoutAction}>
                  <button type="submit" className="neu-btn-sm">
                    {t("nav.logout")}
                  </button>
                </form>
              </>
            ) : (
              <>
                <Link href="/register?role=employer" className="neu-btn-sm">
                  {t("nav.postVacancy")}
                </Link>
                <Link href="/login" className="neu-primary-sm">
                  {t("nav.login")}
                </Link>
              </>
            )}
          </div>
        </MobileMenu>
      </div>
    </header>
  );
}
