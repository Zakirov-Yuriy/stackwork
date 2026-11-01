import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LegalPage } from "../legal-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("legal.terms");
  return { title: t("title") };
}

export default async function TermsPage() {
  const t = await getTranslations("legal.terms");
  return (
    <LegalPage
      title={t("title")}
      intro={t("intro")}
      sections={[
        "Термины и предмет соглашения",
        "Регистрация и аккаунт",
        "Правила размещения вакансий: обязательная зарплатная вилка, модерация, запрещённый контент",
        "Правила откликов",
        "Права и обязанности площадки",
        "Ответственность и ограничения",
        "Интеллектуальная собственность",
        "Изменение и расторжение соглашения",
        "Применимое право и споры",
      ]}
    />
  );
}
