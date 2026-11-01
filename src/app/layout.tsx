import type { Metadata } from "next";
import { Suspense } from "react";
import { Manrope, JetBrains_Mono } from "next/font/google";
import { getLocale } from "next-intl/server";
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

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  // Заголовки и описания по языкам задаёт src/app/[locale]/layout.tsx
  title: { default: "Stackwork", template: "%s | Stackwork" },
  robots: { index: true, follow: true },
  // Подтверждение сайта в Google Search Console и Яндекс Вебмастере: коды в переменных окружения
  verification: {
    ...(process.env.GOOGLE_SITE_VERIFICATION ? { google: process.env.GOOGLE_SITE_VERIFICATION } : {}),
    ...(process.env.YANDEX_VERIFICATION ? { yandex: process.env.YANDEX_VERIFICATION } : {}),
  },
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Язык ставит прокси (src/proxy.ts) по префиксу /en, cookie или Accept-Language; в админке всегда ru
  const locale = await getLocale();
  return (
    <html lang={locale} className={`${manrope.variable} ${jetbrains.variable} h-full`}>
      <body className="flex min-h-full flex-col">
        {children}
        <Suspense fallback={null}>
          <Track />
        </Suspense>
      </body>
    </html>
  );
}
