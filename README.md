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

### Тестовые аккаунты (создаёт `pnpm db:seed`, пароль у всех `password123`)

| Роль         | Почта                       | Куда ведёт после входа                 |
| ------------ | --------------------------- | -------------------------------------- |
| Администратор | `admin@stackwork.local`     | `/admin`, очередь модерации            |
| Работодатель | `employer@stackwork.local`  | `/employer`, компания «Квант Банк»     |
| Соискатель   | `candidate@stackwork.local` | `/me`, мои отклики                     |

Полный сценарий для проверки: работодатель создаёт вакансию и отправляет на модерацию → администратор публикует → соискатель откликается на странице вакансии → работодатель видит отклик в «Откликах» и меняет статус → соискатель видит статус в «Моих откликах».

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
    vacancies/[slug]/            страница вакансии + форма отклика (actions.ts)
    (auth)/                      /login, /register, Server Actions входа и выхода
    me/                          кабинет соискателя: мои отклики
    employer/                    кабинет работодателя
      page.tsx                   список вакансий
      vacancies/new, [id]/edit   форма вакансии (черновик / на модерацию)
      vacancies/[id]/applications  отклики на вакансию, смена статуса
      responses/, company/       все отклики, профиль компании
    admin/                       очередь модерации (роль ADMIN)
    api/v1/vacancies/            REST API (для Flutter)
    layout.tsx, globals.css      шрифты, дизайн-токены
  components/        шапка, футер, карточка вакансии, фильтры, формы, иконки
  lib/
    db.ts            Prisma Client (один экземпляр)
    session.ts       JWT-сессия в httpOnly cookie, getCurrentUser()
    guards.ts        requireUser / requireRole / requireEmployer для страниц
    password.ts      хэширование паролей (scrypt, без зависимостей)
    vacancies.ts     выборка и фильтрация вакансий
    vacancy-form.ts  разбор формы вакансии и чек-лист перед модерацией
    labels.ts        русские подписи enum-ов, форматирование зарплат и дат
    api.ts           DTO для API
  generated/prisma/  сгенерированный Prisma Client (в git не хранится)
```

## Авторизация

- Один вход для всех ролей, роль выбирается при регистрации (`CANDIDATE` или `EMPLOYER`). `ADMIN` назначается только через базу или сид.
- Сессия: JWT (HS256, `jose`) в httpOnly cookie `sw_session` на 30 дней. Секрет в `SESSION_SECRET` (`.env`).
- Тот же JWT принимается в заголовке `Authorization: Bearer …` (для мобильного API; эндпоинт выдачи токена ещё не сделан).
- Пароли: `scrypt` из `node:crypto`, формат `scrypt$salt$hash`.

## Жизненный цикл вакансии

`DRAFT` → `MODERATION` → `PUBLISHED` (или `REJECTED`) → `ARCHIVED`

- Черновик сохраняется в любом виде.
- На модерацию уходит только вакансия, прошедшая чек-лист: название от 8 символов, зарплатная вилка, минимум 3 технологии, заполнены «задачи» и «что важно», нет требований к возрасту и полу.
- Правки опубликованной вакансии применяются сразу, без повторной модерации.
- В поиске и API показываются только `PUBLISHED`.

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

- [x] Авторизация (email + пароль, сессия в cookie)
- [x] Кабинет работодателя: форма вакансии, модерация, отклики
- [x] Кабинет соискателя: отклики
- [ ] Резюме соискателя на сайте (сейчас отклик ссылкой на резюме или GitHub)
- [ ] Письма: подтверждение почты, уведомления об откликах и смене статуса
- [ ] Восстановление пароля
- [ ] API: выдача JWT для мобильного приложения, отклики через API
- [ ] Страницы компаний, зарплаты по стеку
- [ ] Защита от спама: капча на регистрацию и отклики, лимиты
- [ ] Деплой на VPS в РФ (Docker Compose: app + Postgres + Caddy)
