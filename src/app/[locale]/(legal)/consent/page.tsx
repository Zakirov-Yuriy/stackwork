import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LegalPage } from "../legal-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("legal.consent");
  return { title: t("title") };
}

export default async function ConsentPage() {
  const t = await getTranslations("legal.consent");
  return (
    <LegalPage
      title={t("title")}
      intro={t("intro")}
      sections={["Кому даётся согласие", "Перечень данных", "Цели обработки", "Действия с данными и передача работодателям", "Срок действия и отзыв согласия"]}
    />
  );
}
