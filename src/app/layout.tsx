import type { Metadata } from "next";
import { Manrope, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "cyrillic"],
  weight: ["500", "600", "700", "800"],
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin", "cyrillic"],
  weight: ["500", "600"],
});

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Stackwork: IT-вакансии с указанной зарплатой",
    template: "%s | Stackwork",
  },
  description:
    "Вакансии для разработчиков, DevOps, данных, QA и аналитики. Зарплатная вилка и стек видны в каждой карточке.",
  openGraph: {
    type: "website",
    siteName: "Stackwork",
    locale: "ru_RU",
    title: "Stackwork: IT-вакансии с указанной зарплатой",
    description: "Вакансии для разработчиков, DevOps, данных, QA и аналитики. Зарплатная вилка и стек видны в каждой карточке.",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ru" className={`${manrope.variable} ${jetbrains.variable} h-full`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
