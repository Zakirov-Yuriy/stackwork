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

  const notice =
    sp.verify === "ok" ? "Почта подтверждена. Войдите, чтобы продолжить." : sp.verify === "expired" ? "Ссылка подтверждения устарела. Войдите и запросите новую в кабинете." : null;

  return (
    <AuthCard active="login" next={next}>
      <AuthTitle title="С возвращением" subtitle="Введите почту и пароль, чтобы войти." />
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
