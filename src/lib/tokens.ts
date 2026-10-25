import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import type { TokenType } from "@/generated/prisma/client";

const TTL_MS: Record<TokenType, number> = {
  VERIFY_EMAIL: 24 * 3600_000,
  RESET_PASSWORD: 3600_000,
};

function hash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

/** Создаёт одноразовый токен, старые того же типа у пользователя аннулирует. Возвращает сырой токен для ссылки. */
export async function issueToken(userId: string, type: TokenType): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  await db.$transaction([
    db.verificationToken.updateMany({ where: { userId, type, usedAt: null }, data: { usedAt: new Date() } }),
    db.verificationToken.create({ data: { userId, type, tokenHash: hash(token), expiresAt: new Date(Date.now() + TTL_MS[type]) } }),
  ]);
  return token;
}

/** Проверяет токен и помечает использованным. Возвращает userId или null. */
export async function consumeToken(token: string, type: TokenType): Promise<string | null> {
  if (!token || token.length < 20) return null;
  const row = await db.verificationToken.findUnique({ where: { tokenHash: hash(token) } });
  if (!row || row.type !== type || row.usedAt || row.expiresAt < new Date()) return null;
  await db.verificationToken.update({ where: { id: row.id }, data: { usedAt: new Date() } });
  return row.userId;
}

/** Только проверка без списания (для показа формы сброса пароля). */
export async function peekToken(token: string, type: TokenType): Promise<boolean> {
  if (!token || token.length < 20) return false;
  const row = await db.verificationToken.findUnique({ where: { tokenHash: hash(token) }, select: { type: true, usedAt: true, expiresAt: true } });
  return Boolean(row && row.type === type && !row.usedAt && row.expiresAt > new Date());
}
