import { NextResponse } from "next/server";

export const revalidate = 3600;

/**
 * Digital Asset Links для Android App Links: подтверждает, что приложение
 * com.stackworkjobs.app может открывать ссылки stackworkjobs.vercel.app.
 *
 * ANDROID_CERT_SHA256: отпечатки SHA-256 ключей подписи через запятую
 * (ключ загрузки из key.properties и ключ подписи Google Play из Play Console,
 * раздел «Целостность приложения»). Формат: AA:BB:CC:... (32 пары).
 * Пока переменная не задана, отдаём пустой список: ссылки открываются в браузере.
 */
export function GET() {
  const packageName = process.env.ANDROID_PACKAGE_NAME ?? "com.stackworkjobs.app";
  const fingerprints = (process.env.ANDROID_CERT_SHA256 ?? "")
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter((s) => /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(s));

  const body = fingerprints.length
    ? [
        {
          relation: ["delegate_permission/common.handle_all_urls"],
          target: { namespace: "android_app", package_name: packageName, sha256_cert_fingerprints: fingerprints },
        },
      ]
    : [];

  return NextResponse.json(body, {
    headers: { "Cache-Control": "public, max-age=3600, s-maxage=3600", "Content-Type": "application/json" },
  });
}
