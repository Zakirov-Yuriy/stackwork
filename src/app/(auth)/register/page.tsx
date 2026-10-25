import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { AuthCard, AuthTitle, SocialRow } from "../auth-card";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "Регистрация" };

export default async function RegisterPage(props: PageProps<"/register">) {
  const sp = await props.searchParams;
  const next = typeof sp.next === "string" && sp.next.startsWith("/") ? sp.next : "/";
  const initialRole = sp.role === "employer" ? "EMPLOYER" : "CANDIDATE";
  const user = await getCurrentUser();
  if (user) redirect(next === "/" ? "/" : next);

  return (
    <AuthCard active="register" next={next}>
      <AuthTitle title="Создать аккаунт" subtitle="Выберите роль: от неё зависит, какой кабинет откроется." />
      <RegisterForm next={next} initialRole={initialRole} />
      <SocialRow />
    </AuthCard>
  );
}
