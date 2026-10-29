"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Пока идёт импорт, перечитываем страницу раз в несколько секунд. */
export function AutoRefresh({ active, everyMs = 4000 }: { active: boolean; everyMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => router.refresh(), everyMs);
    return () => clearInterval(t);
  }, [active, everyMs, router]);
  return null;
}
