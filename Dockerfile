# Сборка и запуск Stackwork в Docker (вариант хостинга на VPS).
# docker compose -f docker-compose.prod.yml up -d --build
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.28.0 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml prisma.config.ts ./
COPY prisma ./prisma
# DATABASE_URL нужен только чтобы prisma generate прочитал конфиг
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"
RUN pnpm install --frozen-lockfile

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"
ENV NEXT_TELEMETRY_DISABLED=1
ENV DOCKER_BUILD=1
RUN pnpm db:generate && pnpm build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
RUN corepack enable && corepack prepare pnpm@10.28.0 --activate
COPY --from=build /app/public ./public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
# Для миграций при старте: prisma CLI и схема
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts ./prisma.config.ts
COPY --from=build /app/node_modules/prisma ./node_modules/prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=build /app/node_modules/.bin/prisma ./node_modules/.bin/prisma
COPY docker/start.sh ./start.sh
RUN chmod +x ./start.sh
EXPOSE 3000
CMD ["./start.sh"]
