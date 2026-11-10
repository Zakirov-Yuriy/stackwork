import "server-only";
import { createSign } from "node:crypto";
import { db } from "@/lib/db";

/**
 * Push-уведомления мобильного приложения через Firebase Cloud Messaging (HTTP v1).
 *
 * Настройка: в Firebase Console создать проект, добавить Android-приложение com.stackworkjobs.app,
 * в «Настройки проекта → Сервисные аккаунты» сгенерировать закрытый ключ и положить JSON целиком
 * в переменную FIREBASE_SERVICE_ACCOUNT (можно в base64). Пока переменная пуста, push выключены:
 * функции ниже молча ничего не отправляют, остальной сайт работает как обычно.
 *
 * Доступ к FCM по OAuth2: подписываем JWT ключом сервисного аккаунта и меняем его на access token
 * (живёт час, кешируем в памяти функции). Библиотека firebase-admin не нужна.
 * FCM_API_BASE и GOOGLE_TOKEN_URL переопределяются в тестах.
 *
 * Адресат: FCM переходит с registration token на Firebase Installation ID (поле message.fid);
 * приложение присылает FID (kind = "fid"), старые токены (kind = "token") тоже поддерживаются.
 */

type ServiceAccount = { project_id: string; client_email: string; private_key: string };

export type PushMessage = {
  title: string;
  body: string;
  /** Строковые данные для приложения: тип события и куда перейти по нажатию */
  data?: Record<string, string>;
};

let cachedAccount: ServiceAccount | null | undefined;
let cachedToken: { value: string; expiresAt: number } | null = null;

function account(): ServiceAccount | null {
  if (cachedAccount !== undefined) return cachedAccount;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT?.trim();
  if (!raw) return (cachedAccount = null);
  try {
    const json = raw.startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8");
    const parsed = JSON.parse(json) as Partial<ServiceAccount>;
    if (!parsed.project_id || !parsed.client_email || !parsed.private_key) throw new Error("нет project_id, client_email или private_key");
    cachedAccount = { project_id: parsed.project_id, client_email: parsed.client_email, private_key: parsed.private_key.replace(/\\n/g, "\n") };
  } catch (e) {
    console.error("[push] FIREBASE_SERVICE_ACCOUNT не разобран:", e instanceof Error ? e.message : e);
    cachedAccount = null;
  }
  return cachedAccount;
}

export function pushEnabled() {
  return account() !== null;
}

function b64url(input: Buffer | string) {
  return Buffer.from(input).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}

async function accessToken(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.expiresAt - 60 > now) return cachedToken.value;
  const tokenUrl = process.env.GOOGLE_TOKEN_URL ?? "https://oauth2.googleapis.com/token";
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(
    JSON.stringify({ iss: sa.client_email, scope: "https://www.googleapis.com/auth/firebase.messaging", aud: tokenUrl, iat: now, exp: now + 3600 }),
  );
  const signature = createSign("RSA-SHA256").update(`${header}.${claims}`).end().sign(sa.private_key);
  const assertion = `${header}.${claims}.${b64url(signature)}`;
  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
  });
  if (!res.ok) throw new Error(`token ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const json = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { value: json.access_token, expiresAt: now + (json.expires_in ?? 3600) };
  return json.access_token;
}

type Device = { token: string; kind: string };

/** Результат отправки на одно устройство: ok, dead (адрес больше не действует, удалить) или error */
async function sendToDevice(sa: ServiceAccount, bearer: string, device: Device, msg: PushMessage): Promise<"ok" | "dead" | "error"> {
  const base = process.env.FCM_API_BASE ?? "https://fcm.googleapis.com";
  const target = device.kind === "token" ? { token: device.token } : { fid: device.token };
  const res = await fetch(`${base}/v1/projects/${sa.project_id}/messages:send`, {
    method: "POST",
    headers: { Authorization: `Bearer ${bearer}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      message: {
        ...target,
        notification: { title: msg.title, body: msg.body },
        data: msg.data ?? {},
        android: { priority: "high", notification: { channel_id: "applications", icon: "ic_notification", color: "#3b6fd9", sound: "default" } },
      },
    }),
  });
  if (res.ok) return "ok";
  const text = await res.text();
  // 404 UNREGISTERED: приложение удалено или регистрация сброшена; 400 INVALID_ARGUMENT считаем мёртвым адресом,
  // только если FCM указывает на само поле адресата (иначе это ошибка в нашем payload, устройство не трогаем)
  if (res.status === 404 || /UNREGISTERED/.test(text)) return "dead";
  if (res.status === 400 && /message\.(fid|token)/.test(text)) return "dead";
  console.error(`[push] FCM ${res.status}: ${text.slice(0, 300)}`);
  return "error";
}

/**
 * Отправляет уведомление на все устройства пользователя. Ошибки не бросает: push вторичны,
 * письмо уходит независимо. Возвращает число успешно отправленных.
 */
export async function sendPushToUser(userId: string, msg: PushMessage): Promise<number> {
  const sa = account();
  if (!sa) return 0;
  const devices = await db.deviceToken.findMany({ where: { userId }, select: { token: true, kind: true } });
  if (devices.length === 0) return 0;
  let sent = 0;
  try {
    const bearer = await accessToken(sa);
    const dead: string[] = [];
    for (const d of devices) {
      const r = await sendToDevice(sa, bearer, d, msg);
      if (r === "ok") sent += 1;
      if (r === "dead") dead.push(d.token);
    }
    if (dead.length) await db.deviceToken.deleteMany({ where: { token: { in: dead } } });
  } catch (e) {
    console.error("[push] отправка не удалась:", e instanceof Error ? e.message : e);
  }
  return sent;
}

/** То же для нескольких пользователей (например, всех сотрудников компании) */
export async function sendPushToUsers(userIds: string[], msg: PushMessage): Promise<number> {
  let total = 0;
  for (const id of new Set(userIds)) total += await sendPushToUser(id, msg);
  return total;
}

/** Не бросает и не ждёт: для вызова из server action рядом с sendMailSafe */
export function sendPushSafe(userIds: string | string[], msg: PushMessage) {
  const ids = Array.isArray(userIds) ? userIds : [userIds];
  void sendPushToUsers(ids, msg).catch((e) => console.error("[push]", e));
}

/** Сброс кеша (для тестов) */
export function _resetPushCache() {
  cachedAccount = undefined;
  cachedToken = null;
}
