import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { getCurrentUser } from "@/lib/session";
import { AuthCard, AuthTitle, SocialRow } from "../auth-card";
import { LoginForm } from "./login-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.card");
  return { title: t("login") };
}

/** Адрес возврата без языкового префикса: redirect из @/i18n/navigation добавит его сам. */
function nextOf(raw: string | string[] | undefined) {
  const s = typeof raw === "string" && raw.startsWith("/") && !raw.startsWith("//") ? raw : "/";
  return s.replace(new RegExp(`^/(${routing.locales.join("|")})(?=/|\\?|#|$)`), "") || "/";
}

export default async function LoginPage(props: PageProps<"/[locale]/login">) {
  const sp = await props.searchParams;
  const next = nextOf(sp.next);
  const user = await getCurrentUser();
  if (user) redirect({ href: next, locale: await getLocale() });

  const t = await getTranslations("auth.login");
  const notice = sp.verify === "ok" ? t("verifyOk") : sp.verify === "expired" ? t("verifyExpired") : null;

  return (
    <AuthCard active="login" next={next}>
      <AuthTitle title={t("title")} subtitle={t("subtitle")} />
      {notice ? (
        <div role="status" className="neu-inset mb-5 rounded-xl px-4 py-3 text-sm font-semibold text-[color:var(--soft-text)]">
          {notice}
        </div>
      ) : null}
      <LoginForm next={next} />
      <SocialRow />
    </AuthCard>
  );
}
