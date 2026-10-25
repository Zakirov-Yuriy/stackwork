import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard, AuthTitle } from "../auth-card";
import { ResetForm } from "./reset-form";
import { peekToken } from "@/lib/tokens";

export const metadata: Metadata = { title: "Новый пароль" };

export default async function ResetPage(props: PageProps<"/reset">) {
  const sp = await props.searchParams;
  const token = typeof sp.token === "string" ? sp.token : "";
  const valid = await peekToken(token, "RESET_PASSWORD");

  return (
    <AuthCard active="login" next="/">
      {valid ? (
        <>
          <AuthTitle title="Новый пароль" subtitle="Придумайте пароль не короче 8 символов." />
          <ResetForm token={token} />
        </>
      ) : (
        <>
          <AuthTitle title="Ссылка не работает" subtitle="Она устарела или уже была использована." />
          <Link href="/forgot" className="neu-primary inline-flex items-center justify-center">
            Запросить новую ссылку
          </Link>
        </>
      )}
    </AuthCard>
  );
}
