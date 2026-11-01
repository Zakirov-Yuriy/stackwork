import "server-only";
import { db } from "@/lib/db";
import type { ImportTrigger, Prisma, VacancySource } from "@/generated/prisma/client";
import { slugify, skillSlug, uniqueSlug } from "@/lib/slug";
import { ADAPTER_BY_SOURCE, isImportSource } from "./sources";
import { getImportSettings, type ImportSettings } from "./settings";
import { sanitizeDescription } from "./sanitize";
import {
  cleanLocation,
  companyKey,
  detectDirection,
  detectGrade,
  detectLanguage,
  experienceForGrade,
  extractSkills,
  initialsOf,
  isItJob,
  parseSalaryText,
  stripHtml,
} from "./classify";
import type { RawJob } from "./types";
import { notifyVacancyUrls } from "@/lib/seo/indexing";

export type RunSummary = {
  runId: string;
  source: VacancySource;
  status: "OK" | "ERROR";
  fetched: number;
  created: number;
  updated: number;
  skipped: number;
  archived: number;
  error?: string;
};

type Skipped = { notIt: number; noSalary: number; language: number; notRemote: number; bad: number };

/** Импорт по одному источнику: отдельная запись в журнале. */
export async function runSource(
  source: Exclude<VacancySource, "MANUAL">,
  trigger: ImportTrigger,
  userId: string | null,
  settings?: ImportSettings,
): Promise<RunSummary> {
  const adapter = ADAPTER_BY_SOURCE[source];
  const s = settings ?? (await getImportSettings());
  const run = await db.importRun.create({ data: { source, trigger, triggeredBy: userId } });
  const notes: string[] = [];
  const log = (line: string) => notes.push(line);
  const skipped: Skipped = { notIt: 0, noSalary: 0, language: 0, notRemote: 0, bad: 0 };
  const counters = { fetched: 0, created: 0, updated: 0, archived: 0 };
  const createdSlugs: string[] = [];

  try {
    const boards =
      source === "GREENHOUSE" ? s.greenhouseBoards : source === "LEVER" ? s.leverCompanies : source === "ASHBY" ? s.ashbyBoards : undefined;
    if (adapter.needsBoards && !boards?.length) {
      throw new Error("Не указаны доски компаний для этого источника (Админка → Настройки → Импорт)");
    }
    const jobs = await adapter.fetch({ limit: s.maxPerSource, maxAgeDays: s.maxAgeDays, boards, log });
    counters.fetched = jobs.length;
    const now = new Date();

    for (const job of jobs) {
      const verdict = await upsertJob(job, s, now, skipped);
      if (verdict.result === "created") {
        counters.created++;
        if (verdict.slug) createdSlugs.push(verdict.slug);
      } else if (verdict.result === "updated") counters.updated++;
    }

    // Новые страницы сразу отдаём поисковикам (IndexNow для Яндекса и Bing, Indexing API для Google)
    if (createdSlugs.length && s.autoPublish) {
      const note = await notifyVacancyUrls(createdSlugs);
      if (note) notes.push(`поисковики: ${note}`);
    }

    // Пропавшие из источника вакансии уходят в архив, но только если выборка прошла успешно
    if (jobs.length > 0) {
      const threshold = new Date(now.getTime() - adapter.staleDays * 86_400_000);
      const stale = await db.vacancy.updateMany({
        where: {
          source,
          status: "PUBLISHED",
          OR: [{ lastSeenAt: { lt: threshold } }, { expiresAt: { lt: now } }],
        },
        data: { status: "ARCHIVED" },
      });
      counters.archived = stale.count;
    }

    const skippedTotal = skipped.notIt + skipped.noSalary + skipped.language + skipped.notRemote + skipped.bad;
    const skipNote = [
      skipped.notIt ? `не IT: ${skipped.notIt}` : "",
      skipped.noSalary ? `без зарплаты: ${skipped.noSalary}` : "",
      skipped.language ? `язык: ${skipped.language}` : "",
      skipped.notRemote ? `не удалённые: ${skipped.notRemote}` : "",
      skipped.bad ? `без данных: ${skipped.bad}` : "",
    ]
      .filter(Boolean)
      .join(", ");
    if (skipNote) notes.push(`пропущено: ${skipNote}`);

    await db.importRun.update({
      where: { id: run.id },
      data: { status: "OK", finishedAt: new Date(), ...counters, skipped: skippedTotal, notes: notes.join("\n").slice(0, 4000) },
    });
    return { runId: run.id, source, status: "OK", ...counters, skipped: skippedTotal };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    await db.importRun.update({
      where: { id: run.id },
      data: { status: "ERROR", finishedAt: new Date(), ...counters, error: error.slice(0, 2000), notes: notes.join("\n").slice(0, 4000) },
    });
    return { runId: run.id, source, status: "ERROR", ...counters, skipped: 0, error };
  }
}

/**
 * Импорт по списку источников подряд (или по всем включённым).
 * budgetMs: сколько времени есть на весь запуск (на Vercel функция живёт не дольше 300 с);
 * источники, на которые времени не хватило, пропускаются с записью в журнал и пойдут в следующий запуск.
 */
export async function runImport(opts: { sources?: VacancySource[]; trigger: ImportTrigger; userId?: string | null; budgetMs?: number }): Promise<RunSummary[]> {
  const settings = await getImportSettings();
  const all = (opts.sources?.length ? opts.sources : settings.enabledSources).filter(isImportSource);
  // Самые быстрые источники первыми, Remotive (с паузами между запросами) последним
  const list = [...all].sort((a, b) => (a === "REMOTIVE" ? 1 : 0) - (b === "REMOTIVE" ? 1 : 0));
  const budget = opts.budgetMs ?? 240_000;
  const started = Date.now();
  const results: RunSummary[] = [];
  for (const source of list) {
    const elapsed = Date.now() - started;
    const estimate = source === "REMOTIVE" ? 110_000 : 30_000;
    if (elapsed + estimate > budget) {
      const run = await db.importRun.create({
        data: { source, trigger: opts.trigger, triggeredBy: opts.userId ?? null, status: "ERROR", finishedAt: new Date(), error: "Пропущен: не хватило времени в этом запуске, пойдёт в следующий" },
      });
      results.push({ runId: run.id, source, status: "ERROR", fetched: 0, created: 0, updated: 0, skipped: 0, archived: 0, error: run.error ?? undefined });
      continue;
    }
    results.push(await runSource(source, opts.trigger, opts.userId ?? null, settings));
  }
  return results;
}

/** Сколько запусков идёт прямо сейчас. Запуск старше 10 минут считаем зависшим и не учитываем. */
export async function countRunningImports(): Promise<number> {
  const tenMinAgo = new Date(Date.now() - 10 * 60_000);
  return db.importRun.count({ where: { status: "RUNNING", startedAt: { gt: tenMinAgo } } });
}

/** Есть ли незавершённый запуск (защита от двойного нажатия и наложения cron) */
export async function hasRunningImport(): Promise<boolean> {
  return (await countRunningImports()) > 0;
}

// ───────────────────────────── Одна вакансия ─────────────────────────────

type Verdict = { result: "created" | "updated" | "skipped"; slug?: string };

async function upsertJob(job: RawJob, s: ImportSettings, now: Date, skipped: Skipped): Promise<Verdict> {
  const title = job.title?.trim().slice(0, 160);
  if (!title || !job.companyName?.trim() || !job.externalId || !job.externalUrl) {
    skipped.bad++;
    return { result: "skipped" };
  }
  if (s.remoteOnly && !job.remote) {
    skipped.notRemote++;
    return { result: "skipped" };
  }
  if (!isItJob(title, job.tags)) {
    skipped.notIt++;
    return { result: "skipped" };
  }

  const descriptionHtml = sanitizeDescription(job.descriptionHtml ?? "");
  const text = stripHtml(descriptionHtml);
  if (text.length < 80) {
    skipped.bad++;
    return { result: "skipped" };
  }
  const language = job.language?.slice(0, 2).toLowerCase() || detectLanguage(`${title} ${text}`);
  if (s.languages.length && !s.languages.includes(language)) {
    skipped.language++;
    return { result: "skipped" };
  }

  // Зарплата: числа от источника или разбор строки
  let salaryFrom: number | null = null;
  let salaryTo: number | null = null;
  let currency = "USD";
  let salaryPeriod: "YEAR" | "MONTH" | "HOUR" = "YEAR";
  if (job.salary) {
    if (job.salary.min || job.salary.max) {
      salaryFrom = job.salary.min ?? null;
      salaryTo = job.salary.max ?? null;
      currency = (job.salary.currency ?? "USD").toUpperCase().slice(0, 3);
      salaryPeriod = job.salary.period ?? "YEAR";
    } else if (job.salary.text) {
      const parsed = parseSalaryText(job.salary.text);
      if (parsed) {
        salaryFrom = parsed.min;
        salaryTo = parsed.max;
        currency = parsed.currency ?? "USD";
        salaryPeriod = parsed.period;
      }
    }
  }
  if (salaryFrom && salaryTo && salaryFrom > salaryTo) [salaryFrom, salaryTo] = [salaryTo, salaryFrom];
  if (s.requireSalary && !salaryFrom && !salaryTo) {
    skipped.noSalary++;
    return { result: "skipped" };
  }

  const grade = detectGrade(title, job.seniorityHint);
  const experience = experienceForGrade(grade, title);
  const direction = detectDirection(title, job.tags);
  const skills = extractSkills(title, job.tags, text);
  const workFormat = job.remote ? "REMOTE" : "OFFICE";
  const employment = job.employment ?? "FULL_TIME";

  const company = await upsertCompany(job);

  const existing = await db.vacancy.findUnique({
    where: { source_externalId: { source: job.source, externalId: job.externalId } },
    select: { id: true, status: true, slug: true },
  });

  const skillRows = await Promise.all(
    skills.map((name) =>
      db.skill.upsert({
        where: { slug: skillSlug(name) },
        create: { slug: skillSlug(name), name },
        update: {},
        select: { id: true },
      }),
    ),
  );

  const data: Prisma.VacancyUncheckedUpdateInput = {
    title,
    companyId: company.id,
    direction,
    grade,
    experience,
    workFormat,
    employment,
    city: cleanLocation(job.location)?.slice(0, 80) ?? null,
    salaryFrom,
    salaryTo,
    currency,
    salaryType: "GROSS",
    salaryPeriod,
    descriptionHtml,
    language,
    locationNote: cleanLocation(job.locationNote)?.slice(0, 160) ?? null,
    externalUrl: job.externalUrl,
    applyUrl: job.applyUrl || job.externalUrl,
    lastSeenAt: now,
    expiresAt: job.expiresAt ?? null,
  };

  if (existing) {
    // Скрытые администратором (REJECTED) не трогаем, остальные обновляем и возвращаем из архива
    if (existing.status === "REJECTED") return { result: "skipped" };
    await db.vacancy.update({
      where: { id: existing.id },
      data: {
        ...data,
        status: existing.status === "ARCHIVED" ? (s.autoPublish ? "PUBLISHED" : "MODERATION") : existing.status,
        skills: { deleteMany: {}, create: skillRows.map((r, i) => ({ skillId: r.id, order: i })) },
      },
    });
    return { result: "updated", slug: existing.slug };
  }

  const base = slugify(`${title} ${company.name}`) || `job-${job.source.toLowerCase()}-${job.externalId}`;
  const slug = await uniqueSlug(base, async (sl) => Boolean(await db.vacancy.findUnique({ where: { slug: sl }, select: { id: true } })));
  await db.vacancy.create({
    data: {
      ...(data as Prisma.VacancyUncheckedCreateInput),
      slug,
      source: job.source,
      externalId: job.externalId,
      status: s.autoPublish ? "PUBLISHED" : "MODERATION",
      publishedAt: job.publishedAt,
      importedAt: now,
      acceptsGithubLink: false,
      showCompanyName: true,
      skills: { create: skillRows.map((r, i) => ({ skillId: r.id, order: i })) },
    },
  });
  return { result: "created", slug };
}

async function upsertCompany(job: RawJob) {
  const name = job.companyName.trim().slice(0, 120);
  const key = companyKey(name) || name.toLowerCase();
  const found = await db.company.findUnique({ where: { nameKey: key } });
  if (found) {
    if (!found.logoUrl && job.companyLogo) {
      await db.company.update({ where: { id: found.id }, data: { logoUrl: job.companyLogo } });
    }
    return found;
  }
  // Компания могла быть заведена вручную без nameKey: ищем по имени без учёта регистра
  const byName = await db.company.findFirst({ where: { name: { equals: name, mode: "insensitive" } } });
  if (byName) {
    return db.company.update({ where: { id: byName.id }, data: { nameKey: key, logoUrl: byName.logoUrl ?? job.companyLogo ?? null } });
  }
  const base = slugify(name) || `company-${key.slice(0, 20)}`;
  const slug = await uniqueSlug(base, async (sl) => Boolean(await db.company.findUnique({ where: { slug: sl }, select: { id: true } })));
  return db.company.create({
    data: {
      slug,
      name,
      nameKey: key,
      initials: initialsOf(name),
      logoUrl: job.companyLogo ?? null,
      website: job.companyWebsite ?? null,
      isExternal: true,
    },
  });
}
