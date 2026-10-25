import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard, AuthTitle } from "../auth-card";

export const metadata: Metadata = { title: "Восстановление пароля" };

export default function ForgotPage() {
  return (
    <AuthCard active="login" next="/">
      <AuthTitle title="Восстановление пароля" subtitle="Сброс по ссылке из письма появится вместе с почтовыми уведомлениями." />
      <p className="m-0 text-center text-sm leading-relaxed text-[color:var(--soft-muted)]">
        Пока напишите на <span className="font-semibold text-[color:var(--soft-text)]">[ПОЧТА ПОДДЕРЖКИ]</span> с адреса, на который зарегистрирован аккаунт, и мы поможем.
      </p>
      <Link href="/login" className="neu-btn mt-7 inline-flex w-full items-center justify-center">
        Назад ко входу
      </Link>
    </AuthCard>
  );
}
