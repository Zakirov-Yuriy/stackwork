import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { languageAlternates } from "@/i18n/seo";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("pricing");
  return { title: t("meta.title"), alternates: languageAlternates("/pricing") };
}

const CARDS = ["publish", "applications", "next"] as const;

export default async function PricingPage() {
  const t = await getTranslations("pricing");
  return (
    <>
      <SiteHeader />
      <main className="mx-auto box-border flex w-full max-w-[1180px] flex-1 flex-col gap-7 px-6 pb-14 pt-8">
        <div className="flex max-w-[760px] flex-col gap-2">
          <h1 className="m-0 text-[36px] font-extrabold leading-tight tracking-tight">{t("title")}</h1>
          <p className="m-0 text-[16px] leading-relaxed text-[color:var(--soft-muted)]">{t("lead")}</p>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {CARDS.map((key) => (
            <div key={key} className="neu-card-sm flex flex-col gap-2 p-6">
              <h2 className="m-0 text-lg font-extrabold">{t(`cards.${key}.title`)}</h2>
              <p className="m-0 text-sm leading-relaxed text-[color:var(--soft-text)]">{t(`cards.${key}.text`)}</p>
            </div>
          ))}
        </div>
        <div>
          <Link href="/register?role=employer" className="neu-primary inline-flex items-center justify-center px-8">
            {t("cta")}
          </Link>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
