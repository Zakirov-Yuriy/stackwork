import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { AuthCard, AuthTitle } from "../auth-card";
import { ResetForm } from "./reset-form";
import { peekToken } from "@/lib/tokens";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.reset");
  return { title: t("title") };
}

export default async function ResetPage(props: PageProps<"/[locale]/reset">) {
  const sp = await props.searchParams;
  const token = typeof sp.token === "string" ? sp.token : "";
  const [valid, t] = await Promise.all([peekToken(token, "RESET_PASSWORD"), getTranslations("auth.reset")]);

  return (
    <AuthCard active="login" next="/">
      {valid ? (
        <>
          <AuthTitle title={t("title")} subtitle={t("subtitle")} />
          <ResetForm token={token} />
        </>
      ) : (
        <>
          <AuthTitle title={t("invalidTitle")} subtitle={t("invalidSubtitle")} />
          <Link href="/forgot" className="neu-primary inline-flex items-center justify-center">
            {t("requestNew")}
          </Link>
        </>
      )}
    </AuthCard>
  );
}
