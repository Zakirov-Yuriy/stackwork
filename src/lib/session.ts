import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { cache } from "react";
import { db } from "@/lib/db";
import type { UserRole } from "@/generated/prisma/client";

const COOKIE = "sw_session";
const MAX_AGE_SEC = 30 * 24 * 3600; // 30 дней

export type SessionPayload = { sub: string; role: UserRole };

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) {
    throw new Error("SESSION_SECRET не задан или короче 32 символов. Добавьте его в .env");
  }
  return new TextEncoder().encode(s);
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ role: payload.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SEC}s`)
    .sign(secret());
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"] });
    if (!payload.sub || typeof payload.role !== "string") return null;
    return { sub: payload.sub, role: payload.role as UserRole };
  } catch {
    return null;
  }
}

/**
 * Вызывать только из Server Function или Route Handler.
 * persistent=false: cookie живёт до закрытия браузера (токен внутри всё равно на 30 дней).
 */
export async function setSessionCookie(payload: SessionPayload, opts: { persistent?: boolean } = { persistent: true }) {
  const token = await signSession(payload);
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    ...(opts.persistent === false ? {} : { maxAge: MAX_AGE_SEC }),
  });
}

export async function clearSessionCookie() {
  (await cookies()).delete(COOKIE);
}

/** Токен из cookie (web) или из заголовка Authorization: Bearer (мобильное API). */
async function readToken(authorization?: string | null): Promise<string | null> {
  if (authorization?.startsWith("Bearer ")) return authorization.slice(7).trim();
  return (await cookies()).get(COOKIE)?.value ?? null;
}

export const currentUserSelect = {
  id: true,
  email: true,
  emailVerifiedAt: true,
  name: true,
  role: true,
  companyId: true,
  company: { select: { id: true, slug: true, name: true, initials: true } },
} as const;

/** Текущий пользователь или null. Кэшируется на время одного запроса. */
export const getCurrentUser = cache(async (authorization?: string | null) => {
  const token = await readToken(authorization);
  if (!token) return null;
  const session = await verifySession(token);
  if (!session) return null;
  return db.user.findUnique({ where: { id: session.sub }, select: currentUserSelect });
});

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;
