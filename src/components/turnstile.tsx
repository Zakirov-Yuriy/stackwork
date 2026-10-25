"use client";

import Script from "next/script";

/**
 * Виджет Cloudflare Turnstile. Рендерится только если задан siteKey;
 * ответ попадает в форму скрытым полем cf-turnstile-response.
 */
export function Turnstile({ siteKey }: { siteKey: string }) {
  if (!siteKey) return null;
  return (
    <>
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="lazyOnload" />
      <div className="cf-turnstile" data-sitekey={siteKey} data-theme="light" data-language="ru" />
    </>
  );
}
