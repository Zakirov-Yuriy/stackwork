import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cache Components (PPR + "use cache") отключены осознанно: джоб-борд
  // рендерит страницы динамически из базы по параметрам запроса.
  // Включим, когда понадобится статический shell для SEO-страниц.
  cacheComponents: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
