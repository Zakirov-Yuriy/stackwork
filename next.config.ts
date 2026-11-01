import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  // Cache Components (PPR + "use cache") отключены осознанно: джоб-борд
  // рендерит страницы динамически из базы по параметрам запроса.
  // Включим, когда понадобится статический shell для SEO-страниц.
  cacheComponents: false,
  // Загрузка логотипа компании через server action: файл до 2 МБ плюс поля формы
  experimental: { serverActions: { bodySizeLimit: "3mb" } },
  // Шрифты для карточки вакансии (next/og) должны попасть в бандл функции
  outputFileTracingIncludes: { "/api/og/vacancy/[slug]": ["./src/assets/fonts/*"] },
  // Для Docker-сборки на VPS (DOCKER_BUILD=1 в Dockerfile): минимальный образ с server.js.
  output: process.env.DOCKER_BUILD ? "standalone" : undefined,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default withNextIntl(nextConfig);
