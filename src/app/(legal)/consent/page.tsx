import type { Metadata } from "next";
import { LegalPage } from "../legal-page";

export const metadata: Metadata = { title: "Согласие на обработку персональных данных" };

export default function ConsentPage() {
  return (
    <LegalPage
      title="Согласие на обработку персональных данных"
      intro="Текст согласия, которое пользователь даёт при регистрации и отклике на вакансию."
      sections={["Кому даётся согласие", "Перечень данных", "Цели обработки", "Действия с данными и передача работодателям", "Срок действия и отзыв согласия"]}
    />
  );
}
