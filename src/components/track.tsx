"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

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
    const payload = JSON.stringify({
      path: pathname,
      referrer: document.referrer || null,
      from: search?.get("from") ?? null,
      vacancy: pathname.startsWith("/vacancies/") ? pathname.split("/")[2] ?? null : null,
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
