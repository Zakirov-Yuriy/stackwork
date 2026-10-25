import type { Metadata } from "next";
import { AuthCard, AuthTitle } from "../auth-card";
import { ForgotForm } from "./forgot-form";
import { turnstileSiteKey } from "@/lib/turnstile";

export const metadata: Metadata = { title: "Восстановление пароля" };

export default function ForgotPage() {
  return (
    <AuthCard active="login" next="/">
      <AuthTitle title="Восстановление пароля" subtitle="Пришлём ссылку для нового пароля на почту аккаунта." />
      <ForgotForm siteKey={turnstileSiteKey()} />
    </AuthCard>
  );
}
