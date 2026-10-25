import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { AuthCard, AuthTitle, SocialRow } from "../auth-card";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Вход" };

export default async function LoginPage(props: PageProps<"/login">) {
  const sp = await props.searchParams;
  const next = typeof sp.next === "string" && sp.next.startsWith("/") ? sp.next : "/";
  const user = await getCurrentUser();
  if (user) redirect(next === "/" ? "/" : next);

  return (
    <AuthCard active="login" next={next}>
      <AuthTitle title="С возвращением" subtitle="Введите почту и пароль, чтобы войти." />
      <LoginForm next={next} />
      <SocialRow />
    </AuthCard>
  );
}
