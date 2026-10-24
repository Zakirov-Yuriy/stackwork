import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export default function ForbiddenPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-[1180px] flex-1 flex-col items-start gap-4 px-6 py-16">
        <p className="font-mono text-sm text-muted">403</p>
        <h1 className="m-0 text-[32px] font-extrabold leading-tight tracking-tight">Этот раздел не для вашей роли</h1>
        <p className="m-0 text-base text-muted">
          Кабинет работодателя доступен аккаунтам с ролью «Нанимаю». Если вы ищете работу, вам в «Мои отклики».
        </p>
        <Link href="/" className="mt-2 inline-flex min-h-12 items-center rounded-[10px] bg-accent px-6 text-[15px] font-extrabold text-ink">
          На главную
        </Link>
      </main>
      <SiteFooter compact />
    </>
  );
}
