import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { BrandMark } from "@/components/brand-mark";

const linkCls = "text-[color:var(--soft-muted)] hover:text-[color:var(--soft-text)]";
const headCls = "text-[13px] font-extrabold uppercase tracking-[0.06em] text-[color:var(--soft-text)]";

function Brand({ size = "md" }: { size?: "md" | "sm" }) {
  return (
    <div className={`flex items-center gap-2 font-extrabold text-[color:var(--soft-text)] ${size === "sm" ? "text-base" : "text-lg"}`}>
      <BrandMark size={32} />
      <span>stackwork</span>
    </div>
  );
}

export async function SiteFooter({ compact = false }: { compact?: boolean }) {
  const t = await getTranslations("common.footer");
  if (compact) {
    return (
      <footer className="mt-auto">
        <div className="mx-auto max-w-[1180px] px-6">
          <div className="soft-divider" />
        </div>
        <div className="mx-auto flex max-w-[1180px] flex-wrap items-center gap-5 px-6 py-5 text-[13px]">
          <Brand size="sm" />
          <Link href="/privacy" className={linkCls}>
            {t("privacy")}
          </Link>
          <Link href="/terms" className={linkCls}>
            {t("terms")}
          </Link>
          <span className="ml-auto text-[color:var(--soft-muted)]">{t("copyright")} · {t("operator")}</span>
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
            {t("tagline")}
          </p>
        </div>
        <div className="flex flex-[1_1_160px] flex-col gap-2.5">
          <strong className={headCls}>{t("seekers")}</strong>
          <Link href="/" className={linkCls}>
            {t("vacancies")}
          </Link>
          <Link href="/me" className={linkCls}>
            {t("myResponses")}
          </Link>
          <Link href="/salaries" className={linkCls}>
            {t("salaries")}
          </Link>
          <Link href="/companies" className={linkCls}>
            {t("companies")}
          </Link>
        </div>
        <div className="flex flex-[1_1_160px] flex-col gap-2.5">
          <strong className={headCls}>{t("employers")}</strong>
          <Link href="/employer/vacancies/new" className={linkCls}>
            {t("postVacancy")}
          </Link>
          <Link href="/pricing" className={linkCls}>
            {t("pricing")}
          </Link>
          <Link href="/employer" className={linkCls}>
            {t("cabinet")}
          </Link>
        </div>
        <div className="flex flex-[1_1_200px] flex-col gap-2.5">
          <strong className={headCls}>{t("documents")}</strong>
          <Link href="/privacy" className={linkCls}>
            {t("privacy")}
          </Link>
          <Link href="/consent" className={linkCls}>
            {t("consent")}
          </Link>
          <Link href="/terms" className={linkCls}>
            {t("terms")}
          </Link>
        </div>
      </div>
      <div className="mx-auto flex max-w-[1180px] flex-wrap gap-4 px-6 pb-6 text-xs text-[color:var(--soft-muted)]">
        <span>{t("copyright")}</span>
        <span>{t("operator")}</span>
      </div>
    </footer>
  );
}
