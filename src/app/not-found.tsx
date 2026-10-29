import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-[1180px] flex-1 flex-col items-start gap-4 px-6 py-16">
        <p className="font-mono text-sm text-[color:var(--soft-muted)]">404</p>
        <h1 className="m-0 text-[32px] font-extrabold leading-tight tracking-tight">Такой страницы нет</h1>
        <p className="m-0 text-base text-[color:var(--soft-muted)]">Вакансия могла быть снята с публикации или ссылка устарела.</p>
        <Link
          href="/"
          className="neu-primary-sm mt-2"
        >
          К списку вакансий
        </Link>
      </main>
      <SiteFooter compact />
    </>
  );
}
