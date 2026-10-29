import "server-only";
import { createHash } from "node:crypto";
import type { DeviceKind, PageKind } from "@/generated/prisma/client";

const BOT_RE =
  /bot|crawl|spider|slurp|facebookexternalhit|preview|lighthouse|headless|curl|wget|python-requests|go-http-client|yandex|bingpreview|ahrefs|semrush|mj12|petalbot|gptbot|claudebot|applebot|duckduck/i;

export function isBot(ua: string): boolean {
  return !ua || BOT_RE.test(ua);
}

export function deviceOf(ua: string): DeviceKind {
  if (/ipad|tablet|kindle|playbook|silk/i.test(ua) || (/android/i.test(ua) && !/mobile/i.test(ua))) return "TABLET";
  if (/mobi|iphone|ipod|android|blackberry|opera mini|windows phone/i.test(ua)) return "MOBILE";
  return "DESKTOP";
}

/** Тип экрана по пути: нужен для таблицы «Экраны сайта» */
export function kindOf(path: string): PageKind {
  if (path === "/") return "HOME";
  if (path.startsWith("/apply/")) return "APPLY";
  if (path.startsWith("/vacancies/")) return "VACANCY";
  if (path.startsWith("/companies")) return "COMPANY";
  if (path.startsWith("/login") || path.startsWith("/register")) return "AUTH";
  if (path.startsWith("/employer")) return "EMPLOYER";
  return "OTHER";
}

/**
 * Посетитель за день: хэш от даты, IP, User-Agent и секрета. Адрес не хранится,
 * восстановить его из хэша нельзя, на следующий день тот же человек считается заново.
 */
export function visitorHash(ip: string, ua: string, day: string): string {
  const secret = process.env.SESSION_SECRET ?? "stackwork";
  return createHash("sha256").update(`${day}|${ip}|${ua}|${secret}`).digest("hex").slice(0, 32);
}

export function referrerHost(ref: string | null, selfHost: string | null): string | null {
  if (!ref) return null;
  try {
    const host = new URL(ref).hostname.replace(/^www\./, "");
    if (!host || (selfHost && host === selfHost.replace(/^www\./, ""))) return null;
    return host.slice(0, 100);
  } catch {
    return null;
  }
}

/** Человеческое имя источника перехода для статистики */
export function sourceLabel(host: string | null): string {
  if (!host) return "Прямой заход";
  if (/google\./.test(host)) return "Google";
  if (/yandex\.|ya\.ru/.test(host)) return "Яндекс";
  if (/bing\.com/.test(host)) return "Bing";
  if (/duckduckgo/.test(host)) return "DuckDuckGo";
  if (/t\.me|telegram/.test(host)) return "Telegram";
  if (/vk\.com/.test(host)) return "ВКонтакте";
  if (/linkedin/.test(host)) return "LinkedIn";
  if (/github/.test(host)) return "GitHub";
  if (/habr/.test(host)) return "Хабр";
  if (/reddit/.test(host)) return "Reddit";
  if (/x\.com|twitter/.test(host)) return "X";
  if (/facebook|fb\.com/.test(host)) return "Facebook";
  return host;
}

/** Дата по Москве в формате YYYY-MM-DD: дни в статистике считаем по московскому времени */
export function mskDay(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Moscow", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}
