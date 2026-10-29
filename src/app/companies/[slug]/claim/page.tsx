import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { CompanyAvatar } from "@/components/company-avatar";
import { getCurrentUser } from "@/lib/session";
import { ClaimForm } from "./claim-form";

export const metadata: Metadata = { title: "Это ваша компания?" };

const muted = "text-[color:var(--soft-muted)]";

export default async function ClaimPage(props: PageProps<"/companies/[slug]/claim">) {
  const { slug } = await props.params;
  const c = await db.company.findUnique({ where: { slug }, select: { slug: true, name: true, logoUrl: true, initials: true, claimedAt: true } });
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
              <h1 className="m-0 text-[26px] font-extrabold leading-tight tracking-tight">Это ваша компания?</h1>
              <p className={`m-0 text-sm ${muted}`}>{c.name}</p>
            </div>
          </div>
          <p className="m-0 text-[15px] leading-relaxed">
            Страница компании и её вакансии собраны из открытых источников. Если вы представляете компанию, заберите страницу: после проверки вы получите кабинет работодателя, сможете редактировать вакансии, публиковать новые бесплатно и получать отклики прямо на Stackwork.
          </p>
          {c.claimedAt ? (
            <p className={`m-0 text-sm font-semibold ${muted}`}>Эта страница уже подтверждена работодателем.</p>
          ) : !user ? (
            <div className="flex flex-wrap items-center gap-3">
              <Link href={`/register?role=employer&next=${next}`} className="neu-primary-sm" style={{ minHeight: 48, padding: "0 24px", fontSize: 15 }}>
                Зарегистрироваться как работодатель
              </Link>
              <Link href={`/login?next=${next}`} className="soft-link text-sm">
                Уже есть аккаунт
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
