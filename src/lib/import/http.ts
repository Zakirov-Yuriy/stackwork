import "server-only";

/** User-Agent для источников: они просят представляться и давать контакт. */
export function userAgent() {
  const site = process.env.SITE_URL ?? "https://stackwork.local";
  const contact = process.env.CONTACT_EMAIL ?? "";
  return `Stackwork/1.0 (+${site}${contact ? `; ${contact}` : ""})`;
}

export class HttpError extends Error {
  constructor(
    public status: number,
    public url: string,
  ) {
    super(`HTTP ${status} for ${url}`);
  }
}

/** GET JSON с таймаутом и понятной ошибкой. Ответы не кэшируем. */
export async function fetchJson<T>(url: string, init: RequestInit = {}, timeoutMs = 30_000): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...init,
      cache: "no-store",
      signal: ctrl.signal,
      headers: { Accept: "application/json", "User-Agent": userAgent(), ...(init.headers ?? {}) },
    });
    if (!res.ok) throw new HttpError(res.status, url);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
