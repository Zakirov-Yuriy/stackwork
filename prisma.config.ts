import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Миграции идут по прямому подключению (DIRECT_URL), если оно задано: у Neon и Supabase
    // пулер (pgbouncer) не подходит для миграций. Приложение всегда ходит через DATABASE_URL.
    url: process.env.DIRECT_URL ? env("DIRECT_URL") : env("DATABASE_URL"),
  },
});
