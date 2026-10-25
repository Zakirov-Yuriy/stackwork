import "server-only";
import { clientIp } from "@/lib/rate-limit";

/** Публичный ключ для виджета; пустая строка = капча выключена (dev). */
export function turnstileSiteKey(): string {
  return process.env.TURNSTILE_SITE_KEY ?? "";
}

/**
 * Проверка ответа Cloudflare Turnstile. Если секрет не задан, капча считается пройденной:
 * так локальная разработка работает без ключей.
 */
export async function verifyTurnstile(token: FormDataEntryValue | null): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  if (typeof token !== "string" || !token) return false;
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token, remoteip: await clientIp() }),
      cache: "no-store",
    });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}
