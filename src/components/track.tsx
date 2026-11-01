"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { routing } from "@/i18n/routing";

/** /en/vacancies/x → /vacancies/x: в статистике экраны считаются без языкового префикса */
function stripLocale(pathname: string): string {
  for (const l of routing.locales) {
    if (pathname === `/${l}`) return "/";
    if (pathname.startsWith(`/${l}/`)) return pathname.slice(l.length + 1);
  }
  return pathname;
}

/**
 * Отправляет просмотр страницы в /api/track при каждой навигации.
 * Без cookie: сервер считает посетителя по хэшу дня, адреса и браузера.
 * Параметр ?from=… в адресе говорит, с какого экрана открыли карточку.
 */
export function Track() {
  const pathname = usePathname();
  const search = useSearchParams();
  const last = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin")) return;
    const key = `${pathname}?${search?.toString() ?? ""}`;
    if (last.current === key) return;
    last.current = key;
    const path = stripLocale(pathname);
    const payload = JSON.stringify({
      path,
      referrer: document.referrer || null,
      from: search?.get("from") ?? null,
      vacancy: path.startsWith("/vacancies/") ? path.split("/")[2] ?? null : null,
    });
    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon("/api/track", new Blob([payload], { type: "application/json" }));
      } else {
        fetch("/api/track", { method: "POST", body: payload, headers: { "Content-Type": "application/json" }, keepalive: true }).catch(() => {});
      }
    } catch {
      /* статистика не должна ломать сайт */
    }
  }, [pathname, search]);

  return null;
}
