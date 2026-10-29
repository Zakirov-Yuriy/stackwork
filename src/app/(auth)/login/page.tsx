import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getCurrentUser } from "@/lib/session";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Вход" };

export default async function LoginPage(props: PageProps<"/login">) {
  const sp = await props.searchParams;
  const next = typeof sp.next === "string" && sp.next.startsWith("/") ? sp.next : "/";
  const user = await getCurrentUser();
  if (user) redirect(next === "/" ? "/" : next);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-[1180px] flex-1 justify-center px-6 py-14">
        <div className="flex w-full max-w-[440px] flex-col gap-6 rounded-xl border border-line bg-card p-8">
          <div className="flex flex-col gap-1.5">
            <h1 className="m-0 text-[28px] font-extrabold leading-tight tracking-tight">Вход</h1>
            <p className="m-0 text-sm text-muted">Один вход для соискателей и работодателей.</p>
          </div>
          <LoginForm next={next} />
          <p className="m-0 text-sm text-muted">
            Нет аккаунта?{" "}
            <Link href={`/register${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-bold text-link hover:text-ink">
              Зарегистрироваться
            </Link>
          </p>
        </div>
      </main>
      <SiteFooter compact />
    </>
  );
}
