import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export default async function NotFound() {
  const t = await getTranslations("errors.notFound");
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-[1180px] flex-1 flex-col items-start gap-4 px-6 py-16">
        <p className="font-mono text-sm text-[color:var(--soft-muted)]">404</p>
        <h1 className="m-0 text-[32px] font-extrabold leading-tight tracking-tight">{t("title")}</h1>
        <p className="m-0 text-base text-[color:var(--soft-muted)]">{t("text")}</p>
        <Link
          href="/"
          className="neu-primary-sm mt-2"
        >
          {t("cta")}
        </Link>
      </main>
      <SiteFooter compact />
    </>
  );
}
