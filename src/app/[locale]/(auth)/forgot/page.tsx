import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AuthCard, AuthTitle } from "../auth-card";
import { ForgotForm } from "./forgot-form";
import { turnstileSiteKey } from "@/lib/turnstile";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.forgot");
  return { title: t("title") };
}

export default async function ForgotPage() {
  const t = await getTranslations("auth.forgot");
  return (
    <AuthCard active="login" next="/">
      <AuthTitle title={t("title")} subtitle={t("subtitle")} />
      <ForgotForm siteKey={turnstileSiteKey()} />
    </AuthCard>
  );
}
