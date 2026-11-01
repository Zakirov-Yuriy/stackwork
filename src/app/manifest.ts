import type { MetadataRoute } from "next";

/** Web App Manifest: иконки для Android и «добавить на главный экран», цвета в стиле сайта. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Stackwork, вакансии для IT",
    short_name: "Stackwork",
    description: "Вакансии для разработчиков, DevOps, данных, QA и аналитики. Зарплата и стек видны в каждой карточке.",
    start_url: "/",
    display: "standalone",
    background_color: "#e8ebf0",
    theme_color: "#3b6fd9",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
