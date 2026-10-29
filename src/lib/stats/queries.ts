import "server-only";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { mskDay, sourceLabel } from "./track";

export const PERIODS = { "7": "7 дней", "30": "30 дней", "90": "90 дней" } as const;
export type PeriodKey = keyof typeof PERIODS;

export function parsePeriod(v: string | string[] | undefined): PeriodKey {
  return typeof v === "string" && v in PERIODS ? (v as PeriodKey) : "30";
}

function periodRange(period: PeriodKey) {
  const days = Number(period);
  const today = mskDay();
  const to = new Date(`${today}T00:00:00Z`);
  const from = new Date(to.getTime() - (days - 1) * 86_400_000);
  return { from, to, days };
}

const num = (v: unknown) => Number(v ?? 0);

export type DailyPoint = { day: string; visitors: number; views: number; applications: number };

export async function siteStats(period: PeriodKey) {
  const { from, to, days } = periodRange(period);
  const toExclusive = new Date(to.getTime() + 86_400_000);

  const [totals, daily, screens, topVacancies, sources, devices, applicationsTotal, applicationsDaily] = await Promise.all([
    db.$queryRaw<Array<{ visitors: bigint; views: bigint; vacancy_views: bigint; apply_clicks: bigint; mobile: bigint }>>(Prisma.sql`
      SELECT
        COUNT(DISTINCT (day, "visitorHash")) AS visitors,
        COUNT(*) AS views,
        COUNT(*) FILTER (WHERE kind = 'VACANCY') AS vacancy_views,
        COUNT(*) FILTER (WHERE kind = 'APPLY') AS apply_clicks,
        COUNT(DISTINCT (day, "visitorHash")) FILTER (WHERE device = 'MOBILE') AS mobile
      FROM "PageView" WHERE day >= ${from} AND day <= ${to}`),
    db.$queryRaw<Array<{ day: Date; visitors: bigint; views: bigint }>>(Prisma.sql`
      SELECT day, COUNT(DISTINCT "visitorHash") AS visitors, COUNT(*) AS views
      FROM "PageView" WHERE day >= ${from} AND day <= ${to} GROUP BY day ORDER BY day`),
    db.$queryRaw<Array<{ kind: string; visitors: bigint; views: bigint; mobile: bigint }>>(Prisma.sql`
      SELECT kind, COUNT(DISTINCT (day, "visitorHash")) AS visitors, COUNT(*) AS views,
             COUNT(DISTINCT (day, "visitorHash")) FILTER (WHERE device = 'MOBILE') AS mobile
      FROM "PageView" WHERE day >= ${from} AND day <= ${to} GROUP BY kind ORDER BY views DESC`),
    db.$queryRaw<Array<{ vacancyId: string; visitors: bigint; views: bigint; clicks: bigint; mobile: bigint }>>(Prisma.sql`
      SELECT "vacancyId",
             COUNT(DISTINCT (day, "visitorHash")) FILTER (WHERE kind = 'VACANCY') AS visitors,
             COUNT(*) FILTER (WHERE kind = 'VACANCY') AS views,
             COUNT(*) FILTER (WHERE kind = 'APPLY') AS clicks,
             COUNT(*) FILTER (WHERE device = 'MOBILE' AND kind = 'VACANCY') AS mobile
      FROM "PageView" WHERE day >= ${from} AND day <= ${to} AND "vacancyId" IS NOT NULL
      GROUP BY "vacancyId" ORDER BY visitors DESC, views DESC LIMIT 15`),
    // Откуда пришли: по первому просмотру посетителя за день
    db.$queryRaw<Array<{ host: string | null; visitors: bigint }>>(Prisma.sql`
      SELECT "referrerHost" AS host, COUNT(*) AS visitors FROM (
        SELECT DISTINCT ON (day, "visitorHash") "referrerHost"
        FROM "PageView" WHERE day >= ${from} AND day <= ${to}
        ORDER BY day, "visitorHash", "createdAt"
      ) first GROUP BY "referrerHost" ORDER BY visitors DESC LIMIT 12`),
    db.$queryRaw<Array<{ device: string; visitors: bigint }>>(Prisma.sql`
      SELECT device, COUNT(DISTINCT (day, "visitorHash")) AS visitors
      FROM "PageView" WHERE day >= ${from} AND day <= ${to} GROUP BY device ORDER BY visitors DESC`),
    db.application.count({ where: { createdAt: { gte: from, lt: toExclusive } } }),
    db.$queryRaw<Array<{ day: Date; applications: bigint }>>(Prisma.sql`
      SELECT date_trunc('day', "createdAt" AT TIME ZONE 'Europe/Moscow')::date AS day, COUNT(*) AS applications
      FROM "Application" WHERE "createdAt" >= ${from} AND "createdAt" < ${toExclusive} GROUP BY 1`),
  ]);

  const t = totals[0];
  const visitors = num(t?.visitors);
  const views = num(t?.views);

  // Ряд по дням без дырок
  const byDay = new Map(daily.map((d) => [toDay(d.day), d]));
  const appByDay = new Map(applicationsDaily.map((d) => [toDay(d.day), num(d.applications)]));
  const series: DailyPoint[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(from.getTime() + i * 86_400_000);
    const key = toDay(d);
    const row = byDay.get(key);
    series.push({ day: key, visitors: num(row?.visitors), views: num(row?.views), applications: appByDay.get(key) ?? 0 });
  }

  // Вакансии: названия и отклики за период
  const ids = topVacancies.map((r) => r.vacancyId);
  const [vacancies, appsByVacancy] = ids.length
    ? await Promise.all([
        db.vacancy.findMany({ where: { id: { in: ids } }, select: { id: true, slug: true, title: true, source: true, company: { select: { name: true } } } }),
        db.application.groupBy({ by: ["vacancyId"], where: { vacancyId: { in: ids }, createdAt: { gte: from, lt: toExclusive } }, _count: { _all: true } }),
      ])
    : [[], []];
  const vById = new Map(vacancies.map((v) => [v.id, v]));
  const appsBy = new Map(appsByVacancy.map((a) => [a.vacancyId, a._count._all]));

  // С каких экранов открывали карточки вакансий
  const fromRows = await db.$queryRaw<Array<{ from: string | null; count: bigint }>>(Prisma.sql`
    SELECT "from", COUNT(*) AS count FROM "PageView"
    WHERE day >= ${from} AND day <= ${to} AND kind = 'VACANCY' GROUP BY "from" ORDER BY count DESC LIMIT 8`);


  return {
    period,
    from,
    to,
    totals: {
      visitors,
      views,
      vacancyViews: num(t?.vacancy_views),
      applyClicks: num(t?.apply_clicks),
      applications: applicationsTotal,
      conversion: visitors ? ((applicationsTotal + num(t?.apply_clicks)) / visitors) * 100 : null,
      mobileShare: visitors ? (num(t?.mobile) / visitors) * 100 : null,
    },
    series,
    screens: screens.map((s) => ({
      kind: s.kind,
      label: SCREEN_LABEL[s.kind] ?? s.kind,
      visitors: num(s.visitors),
      views: num(s.views),
      mobile: num(s.visitors) ? (num(s.mobile) / num(s.visitors)) * 100 : null,
    })),
    vacancies: topVacancies
      .map((r) => {
        const v = vById.get(r.vacancyId);
        if (!v) return null;
        const apps = appsBy.get(r.vacancyId) ?? 0;
        return {
          id: v.id,
          slug: v.slug,
          title: v.title,
          company: v.company.name,
          source: v.source,
          visitors: num(r.visitors),
          views: num(r.views),
          clicks: num(r.clicks),
          applications: apps,
          conversion: num(r.visitors) ? ((apps + num(r.clicks)) / num(r.visitors)) * 100 : null,
          mobile: num(r.views) ? (num(r.mobile) / num(r.views)) * 100 : null,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null),
    sources: sources.map((s) => ({ label: sourceLabel(s.host), visitors: num(s.visitors) })),
    devices: devices.map((d) => ({ label: DEVICE_LABEL[d.device] ?? d.device, visitors: num(d.visitors) })),
    cardSources: fromRows.map((r) => ({ label: FROM_LABEL[r.from ?? ""] ?? r.from ?? "Со стороны", count: num(r.count) })),
  };
}

const SCREEN_LABEL: Record<string, string> = {
  HOME: "Главная и поиск",
  VACANCY: "Страница вакансии",
  COMPANY: "Компании",
  AUTH: "Вход и регистрация",
  EMPLOYER: "Кабинет работодателя",
  APPLY: "Переход к работодателю",
  OTHER: "Прочее",
};

const DEVICE_LABEL: Record<string, string> = { DESKTOP: "Компьютер", MOBILE: "Телефон", TABLET: "Планшет" };

const FROM_LABEL: Record<string, string> = {
  "": "Со стороны (ссылка, поиск)",
  list: "Список вакансий",
  similar: "Похожие вакансии",
  company: "Страница компании",
  search: "Поиск",
};

function toDay(d: Date | string): string {
  if (typeof d === "string") return d.slice(0, 10);
  return d.toISOString().slice(0, 10);
}

/** Быстрые цифры для главной админки */
export async function dashboardCounts() {
  const today = mskDay();
  const todayDate = new Date(`${today}T00:00:00Z`);
  const [byStatus, bySource, companies, users, pendingClaims, todayViews, lastRun, newApplications] = await Promise.all([
    db.vacancy.groupBy({ by: ["status"], _count: { _all: true } }),
    db.vacancy.groupBy({ by: ["source"], where: { status: "PUBLISHED" }, _count: { _all: true } }),
    db.company.count(),
    db.user.groupBy({ by: ["role"], _count: { _all: true } }),
    db.companyClaim.count({ where: { status: "PENDING" } }),
    db.$queryRaw<Array<{ visitors: bigint; views: bigint }>>(Prisma.sql`
      SELECT COUNT(DISTINCT "visitorHash") AS visitors, COUNT(*) AS views FROM "PageView" WHERE day = ${todayDate}`),
    db.importRun.findFirst({ orderBy: { startedAt: "desc" } }),
    db.application.count({ where: { status: "NEW" } }),
  ]);
  const status = Object.fromEntries(byStatus.map((s) => [s.status, s._count._all])) as Record<string, number>;
  const roles = Object.fromEntries(users.map((u) => [u.role, u._count._all])) as Record<string, number>;
  return {
    published: status.PUBLISHED ?? 0,
    moderation: status.MODERATION ?? 0,
    archived: status.ARCHIVED ?? 0,
    draft: status.DRAFT ?? 0,
    rejected: status.REJECTED ?? 0,
    imported: bySource.filter((s) => s.source !== "MANUAL").reduce((a, s) => a + s._count._all, 0),
    manual: bySource.find((s) => s.source === "MANUAL")?._count._all ?? 0,
    companies,
    candidates: roles.CANDIDATE ?? 0,
    employers: roles.EMPLOYER ?? 0,
    pendingClaims,
    todayVisitors: num(todayViews[0]?.visitors),
    todayViews: num(todayViews[0]?.views),
    lastRun,
    newApplications,
  };
}
