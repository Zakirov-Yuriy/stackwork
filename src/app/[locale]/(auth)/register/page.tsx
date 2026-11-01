import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { getCurrentUser } from "@/lib/session";
import { AuthCard, AuthTitle, SocialRow } from "../auth-card";
import { RegisterForm } from "./register-form";
import { turnstileSiteKey } from "@/lib/turnstile";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.card");
  return { title: t("register") };
}

/** Адрес возврата без языкового префикса: redirect из @/i18n/navigation добавит его сам. */
function nextOf(raw: string | string[] | undefined) {
  const s = typeof raw === "string" && raw.startsWith("/") && !raw.startsWith("//") ? raw : "/";
  return s.replace(new RegExp(`^/(${routing.locales.join("|")})(?=/|\\?|#|$)`), "") || "/";
}

export default async function RegisterPage(props: PageProps<"/[locale]/register">) {
  const sp = await props.searchParams;
  const next = nextOf(sp.next);
  const initialRole = sp.role === "employer" ? "EMPLOYER" : "CANDIDATE";
  const user = await getCurrentUser();
  if (user) redirect({ href: next, locale: await getLocale() });

  const t = await getTranslations("auth.register");

  return (
    <AuthCard active="register" next={next}>
      <AuthTitle title={t("title")} subtitle={t("subtitle")} />
      <RegisterForm next={next} initialRole={initialRole} siteKey={turnstileSiteKey()} />
      <SocialRow />
    </AuthCard>
  );
}
