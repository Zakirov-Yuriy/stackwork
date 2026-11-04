import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { db } from "@/lib/db";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { CompanyAvatar } from "@/components/company-avatar";
import { getCurrentUser } from "@/lib/session";
import { ClaimForm } from "./claim-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("company.claim");
  // Форма для работодателя, в поиске ей делать нечего (Google уже показывал её как «Is this your company?»)
  return { title: t("title"), robots: { index: false, follow: false } };
}

const muted = "text-[color:var(--soft-muted)]";

export default async function ClaimPage(props: PageProps<"/[locale]/companies/[slug]/claim">) {
  const { slug } = await props.params;
  const [c, t] = await Promise.all([
    db.company.findUnique({ where: { slug }, select: { slug: true, name: true, logoUrl: true, initials: true, claimedAt: true } }),
    getTranslations("company.claim"),
  ]);
  if (!c) notFound();
  const user = await getCurrentUser();
  const next = encodeURIComponent(`/companies/${c.slug}/claim`);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-[1180px] flex-1 justify-center px-6 py-14">
        <div className="neu-card flex w-full max-w-[560px] flex-col gap-6 p-8">
          <div className="flex items-center gap-4">
            <CompanyAvatar name={c.name} logoUrl={c.logoUrl} initials={c.initials} size={56} />
            <div className="flex flex-col gap-1">
              <h1 className="m-0 text-[26px] font-extrabold leading-tight tracking-tight">{t("title")}</h1>
              <p className={`m-0 text-sm ${muted}`}>{c.name}</p>
            </div>
          </div>
          <p className="m-0 text-[15px] leading-relaxed">{t("text")}</p>
          {c.claimedAt ? (
            <p className={`m-0 text-sm font-semibold ${muted}`}>{t("alreadyClaimed")}</p>
          ) : !user ? (
            <div className="flex flex-wrap items-center gap-3">
              <Link href={`/register?role=employer&next=${next}`} className="neu-primary-sm" style={{ minHeight: 48, padding: "0 24px", fontSize: 15 }}>
                {t("registerEmployer")}
              </Link>
              <Link href={`/login?next=${next}`} className="soft-link text-sm">
                {t("haveAccount")}
              </Link>
            </div>
          ) : (
            <ClaimForm slug={c.slug} />
          )}
        </div>
      </main>
      <SiteFooter compact />
    </>
  );
}
