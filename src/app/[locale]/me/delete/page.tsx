import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireUser } from "@/lib/guards";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { DeleteForm } from "./delete-form";

/**
 * Удаление аккаунта: доступно с сайта и по ссылке из приложения
 * (Google Play требует веб-адрес для запроса удаления аккаунта).
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("me.delete");
  return { title: t("title"), robots: { index: false, follow: false } };
}

export default async function DeleteAccountPage() {
  const user = await requireUser("/me/delete");
  const t = await getTranslations("me.delete");
  return (
    <>
      <SiteHeader />
      <main className="mx-auto box-border flex w-full max-w-[1180px] flex-1 flex-col gap-6 px-6 pb-12 pt-8">
        <div className="flex flex-col gap-1.5">
          <h1 className="m-0 text-[30px] font-extrabold leading-tight tracking-tight">{t("title")}</h1>
          <p className="m-0 text-[15px] text-[color:var(--soft-muted)]">{t("subtitle", { email: user.email })}</p>
        </div>
        <div className="neu-card-sm flex flex-col gap-4 p-7">
          <p className="m-0 text-sm leading-relaxed">{t("whatIsDeleted")}</p>
          {user.role === "EMPLOYER" ? <p className="m-0 text-sm leading-relaxed text-[color:var(--soft-muted)]">{t("employerNote")}</p> : null}
          <DeleteForm />
        </div>
        <Link href="/me" className="soft-link self-start text-sm">
          {t("back")}
        </Link>
      </main>
      <SiteFooter compact />
    </>
  );
}
