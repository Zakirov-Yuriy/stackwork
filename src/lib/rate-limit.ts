import "server-only";
import { headers } from "next/headers";

/**
 * Простой лимитер по IP в памяти процесса. Для одного сервера достаточно;
 * при масштабировании на несколько инстансов заменить на Redis.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

export async function clientIp(): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  return (fwd?.split(",")[0] ?? h.get("x-real-ip") ?? "unknown").trim();
}

/** true, если лимит превышен. key: например "login", limit запросов за windowSec. */
export async function rateLimited(key: string, limit: number, windowSec: number): Promise<boolean> {
  // RATE_LIMIT_OFF=1 отключает лимиты (только для автотестов и локальной отладки)
  if (process.env.RATE_LIMIT_OFF === "1") return false;
  const ip = await clientIp();
  const id = `${key}:${ip}`;
  const now = Date.now();
  const b = buckets.get(id);
  if (!b || b.resetAt < now) {
    buckets.set(id, { count: 1, resetAt: now + windowSec * 1000 });
    if (buckets.size > 10_000) {
      for (const [k, v] of buckets) if (v.resetAt < now) buckets.delete(k);
    }
    return false;
  }
  b.count += 1;
  return b.count > limit;
}
