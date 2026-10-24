# Stackwork

Площадка IT-вакансий с указанной зарплатой. Сайт на Next.js, API для мобильного приложения на Flutter.

## Стек

- **Next.js 16** (App Router, серверный рендер), **React 19**, **TypeScript**
- **Tailwind CSS 4**
- **PostgreSQL 16** + **Prisma 7** (адаптер `@prisma/adapter-pg`)
- **pnpm**

## Запуск на Windows

Нужно поставить один раз:

1. **Node.js LTS** (22.x): https://nodejs.org
2. **pnpm**: в PowerShell `npm install -g pnpm`
3. **Docker Desktop** (для Postgres): https://www.docker.com/products/docker-desktop/

Дальше в терминале VS Code из папки проекта:

```powershell
# 1. Зависимости
pnpm install

# 2. Переменные окружения
copy .env.example .env

# 3. База данных (Postgres в Docker, порт 5432)
docker compose up -d

# 4. Таблицы и демо-данные
pnpm db:migrate
pnpm db:seed

# 5. Dev-сервер
pnpm dev
```

Сайт: http://localhost:3000

## Команды

| Команда            | Что делает                                               |
| ------------------ | -------------------------------------------------------- |
| `pnpm dev`         | dev-сервер с hot reload                                  |
| `pnpm build`       | продакшен-сборка                                         |
| `pnpm start`       | запуск собранного приложения                             |
| `pnpm lint`        | ESLint                                                   |
| `pnpm typecheck`   | проверка типов TypeScript                                |
| `pnpm db:migrate`  | применить миграции (dev: создаёт новую при изменении схемы) |
| `pnpm db:seed`     | загрузить демо-компании и вакансии                       |
| `pnpm db:studio`   | Prisma Studio: просмотр и правка данных в браузере       |
| `pnpm db:generate` | перегенерировать Prisma Client после правки схемы        |

## Структура

```
prisma/
  schema.prisma      модели: User, Company, Vacancy, Skill, Application
  seed.ts            демо-данные
  migrations/        SQL-миграции
src/
  app/
    page.tsx                     главная: поиск, фильтры, список
    vacancies/[slug]/page.tsx    страница вакансии
    api/v1/vacancies/            REST API (для Flutter)
    layout.tsx, globals.css      шрифты, дизайн-токены
  components/        шапка, футер, карточка вакансии, фильтры, иконки
  lib/
    db.ts            Prisma Client (один экземпляр)
    vacancies.ts     выборка и фильтрация вакансий
    labels.ts        русские подписи enum-ов, форматирование зарплат и дат
    api.ts           DTO для API
  generated/prisma/  сгенерированный Prisma Client (в git не хранится)
```

## API v1

Все ответы JSON, кодировка UTF-8.

**`GET /api/v1/vacancies`** — список с фильтрами и пагинацией.

Параметры: `q`, `city`, `format` (REMOTE | HYBRID | OFFICE), `grade` (JUNIOR | MIDDLE | SENIOR | LEAD),
`exp` (NONE | ONE_TO_THREE | THREE_TO_SIX | SIX_PLUS), `employment` (FULL_TIME | PART_TIME | CONTRACT),
`salary` (число), `skills` (slug-и через запятую), `sort` (date | salary), `page`.

Несколько значений можно передавать через запятую или повтором параметра: `?grade=MIDDLE,SENIOR` или `?grade=MIDDLE&grade=SENIOR`.

```json
{
  "items": [{ "id": "…", "slug": "…", "title": "…", "company": {…}, "salary": {…}, "skills": [...] }],
  "page": 1, "pageSize": 20, "pages": 1, "total": 6
}
```

**`GET /api/v1/vacancies/:slug`** — карточка: всё из списка плюс `company` (полная), `description` (разделы) и `similar` (похожие).

Ошибки: `{ "error": { "status": 404, "message": "…" } }`.

## Изменение схемы базы

1. Правим `prisma/schema.prisma`
2. `pnpm db:migrate` (попросит имя миграции)
3. Клиент перегенерируется автоматически

## Продуктовые правила, заложенные в код

- Вакансия без зарплатной вилки не показывается в поиске (отдаём только `status = PUBLISHED`; валидация вилки появится в форме работодателя).
- Фильтр «Удалённо» показывает и вакансии «удалённо или офис».
- Роли пользователей: `CANDIDATE`, `EMPLOYER`, `ADMIN`. Вход один, роль выбирается при регистрации.

## Что дальше

- [ ] Авторизация (email + пароль, JWT для мобильного API)
- [ ] Кабинет работодателя: форма вакансии, модерация, отклики
- [ ] Кабинет соискателя: резюме, отклики
- [ ] Страницы компаний, зарплаты по стеку
- [ ] Деплой на VPS в РФ (Docker Compose: app + Postgres + Caddy)
