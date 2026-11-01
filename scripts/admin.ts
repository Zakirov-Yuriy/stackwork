/**
 * Создать администратора или сделать администратором существующего пользователя (без демо-данных).
 * pnpm admin:create admin@example.com "пароль" "Имя"
 * С продакшен базой: задать DATABASE_URL в .env или в окружении перед запуском.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword } from "../src/lib/password";

async function main() {
  const [email, password, name] = process.argv.slice(2);
  if (!email || !password) {
    console.error('Использование: pnpm admin:create email "пароль" ["Имя"]');
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("Пароль короче 8 символов");
    process.exit(1);
  }
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  const passwordHash = await hashPassword(password);
  const user = await db.user.upsert({
    where: { email: email.toLowerCase() },
    create: { email: email.toLowerCase(), name: name ?? "Администратор", role: "ADMIN", passwordHash, emailVerifiedAt: new Date() },
    update: { role: "ADMIN", passwordHash, emailVerifiedAt: new Date(), ...(name ? { name } : {}) },
    select: { email: true, role: true },
  });
  console.log(`Готово: ${user.email}, роль ${user.role}. Вход: /login`);
  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
