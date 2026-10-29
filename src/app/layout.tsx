import type { Metadata } from "next";
import { Suspense } from "react";
import { Manrope, JetBrains_Mono } from "next/font/google";
import { Track } from "@/components/track";
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

export const metadata: Metadata = {
  title: {
    default: "Stackwork: IT-вакансии с указанной зарплатой",
    template: "%s | Stackwork",
  },
  description:
    "Вакансии для разработчиков, DevOps, данных, QA и аналитики. Зарплатная вилка и стек видны в каждой карточке.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ru" className={`${manrope.variable} ${jetbrains.variable} h-full`}>
      <body className="flex min-h-full flex-col">
        {children}
        <Suspense fallback={null}>
          <Track />
        </Suspense>
      </body>
    </html>
  );
}
