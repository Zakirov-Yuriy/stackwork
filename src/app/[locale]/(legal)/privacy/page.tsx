import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LegalPage } from "../legal-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("legal.privacy");
  return { title: t("title") };
}

export default async function PrivacyPage() {
  const t = await getTranslations("legal.privacy");
  return (
    <LegalPage
      title={t("title")}
      intro={t("intro")}
      sections={[
        "Общие положения и термины",
        "Оператор и контакты",
        "Какие данные обрабатываются (аккаунт, резюме, отклики, технические данные)",
        "Цели и правовые основания обработки",
        "Передача третьим лицам (работодатели, почтовый и хостинг-провайдеры)",
        "Сроки хранения и удаление аккаунта",
        "Права пользователя и порядок обращений",
        "Cookie и аналитика",
        "Изменения политики",
      ]}
    />
  );
}
