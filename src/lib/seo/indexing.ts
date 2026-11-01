import "server-only";
import { SignJWT, importPKCS8 } from "jose";
import { siteUrl } from "@/lib/mail";

/**
 * Уведомление поисковиков о новых и изменённых страницах.
 *
 * IndexNow (Яндекс, Bing и другие): один POST со списком адресов. Ключ в INDEXNOW_KEY,
 * файл ключа отдаётся по /api/indexnow/key.txt (keyLocation).
 *
 * Google Indexing API: официально предназначен для страниц с разметкой JobPosting, то есть
 * ровно для наших вакансий. Нужен сервисный аккаунт Google Cloud, добавленный владельцем
 * сайта в Search Console. JSON ключа целиком в GOOGLE_INDEXING_SA_JSON (можно в base64).
 * Квота по умолчанию 200 адресов в сутки.
 *
 * Все функции молчат об ошибках: индексация не должна ломать импорт и модерацию.
 */

function isProduction(): boolean {
  const url = siteUrl("/");
  return /^https:\/\//.test(url) && !/localhost|127\.0\.0\.1/.test(url);
}

export function indexNowKey(): string | null {
  const k = process.env.INDEXNOW_KEY?.trim();
  return k && /^[a-zA-Z0-9-]{8,128}$/.test(k) ? k : null;
}

export async function notifyIndexNow(urls: string[]): Promise<{ sent: number; status?: number; error?: string }> {
  const key = indexNowKey();
  if (!key || !isProduction() || !urls.length) return { sent: 0 };
  const host = new URL(siteUrl("/")).host;
  try {
    const res = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ host, key, keyLocation: siteUrl("/api/indexnow/key.txt"), urlList: urls.slice(0, 10_000) }),
      cache: "no-store",
    });
    return { sent: urls.length, status: res.status };
  } catch (e) {
    return { sent: 0, error: e instanceof Error ? e.message : String(e) };
  }
}

type ServiceAccount = { client_email: string; private_key: string };

function serviceAccount(): ServiceAccount | null {
  const raw = process.env.GOOGLE_INDEXING_SA_JSON?.trim();
  if (!raw) return null;
  try {
    const json = raw.startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8");
    const sa = JSON.parse(json) as Partial<ServiceAccount>;
    if (!sa.client_email || !sa.private_key) return null;
    return { client_email: sa.client_email, private_key: sa.private_key.replace(/\\n/g, "\n") };
  } catch {
    return null;
  }
}

let cachedToken: { value: string; expiresAt: number } | null = null;

async function googleAccessToken(sa: ServiceAccount): Promise<string | null> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;
  try {
    const key = await importPKCS8(sa.private_key, "RS256");
    const now = Math.floor(Date.now() / 1000);
    const assertion = await new SignJWT({ scope: "https://www.googleapis.com/auth/indexing" })
      .setProtectedHeader({ alg: "RS256", typ: "JWT" })
      .setIssuer(sa.client_email)
      .setAudience("https://oauth2.googleapis.com/token")
      .setIssuedAt(now)
      .setExpirationTime(now + 3600)
      .sign(key);
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { access_token?: string; expires_in?: number };
    if (!data.access_token) return null;
    cachedToken = { value: data.access_token, expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000 };
    return data.access_token;
  } catch {
    return null;
  }
}

export async function notifyGoogleIndexing(urls: string[], limit = 150): Promise<{ sent: number; failed: number; error?: string }> {
  const sa = serviceAccount();
  if (!sa || !isProduction() || !urls.length) return { sent: 0, failed: 0 };
  const token = await googleAccessToken(sa);
  if (!token) return { sent: 0, failed: 0, error: "не удалось получить токен Google" };
  let sent = 0;
  let failed = 0;
  for (const url of urls.slice(0, limit)) {
    try {
      const res = await fetch("https://indexing.googleapis.com/v3/urlNotifications:publish", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ url, type: "URL_UPDATED" }),
        cache: "no-store",
      });
      if (res.ok) sent++;
      else {
        failed++;
        // Квота исчерпана: дальше не стучимся
        if (res.status === 429) break;
      }
    } catch {
      failed++;
    }
  }
  return { sent, failed };
}

/** Сообщить поисковикам о страницах вакансий по их slug. Возвращает короткую строку для журнала. */
export async function notifyVacancyUrls(slugs: string[]): Promise<string | null> {
  const unique = [...new Set(slugs)].filter(Boolean);
  if (!unique.length || !isProduction()) return null;
  const urls = unique.map((s) => siteUrl(`/vacancies/${s}`));
  const [indexNow, google] = await Promise.all([notifyIndexNow(urls), notifyGoogleIndexing(urls)]);
  const parts: string[] = [];
  if (indexNowKey()) parts.push(`IndexNow: ${indexNow.sent} адресов${indexNow.status ? `, ответ ${indexNow.status}` : ""}${indexNow.error ? `, ошибка ${indexNow.error}` : ""}`);
  if (serviceAccount()) parts.push(`Google: ${google.sent} отправлено${google.failed ? `, ${google.failed} с ошибкой` : ""}${google.error ? `, ${google.error}` : ""}`);
  return parts.length ? parts.join("; ") : null;
}
