import { db } from "@/lib/db";
import type {
  Grade,
  WorkFormat,
  Employment,
  ExperienceLevel,
  Prisma,
} from "@/generated/prisma/client";

export const PAGE_SIZE = 20;

export type VacancyFilters = {
  q?: string;
  city?: string;
  format?: WorkFormat[];
  grade?: Grade[];
  experience?: ExperienceLevel;
  employment?: Employment[];
  salaryFrom?: number;
  skills?: string[]; // slugs
  sort?: "date" | "salary";
  page?: number;
};

const GRADES: Grade[] = ["JUNIOR", "MIDDLE", "SENIOR", "LEAD"];
const FORMATS: WorkFormat[] = ["REMOTE", "HYBRID", "OFFICE", "REMOTE_OR_OFFICE"];
const EMPLOYMENTS: Employment[] = ["FULL_TIME", "PART_TIME", "CONTRACT"];
const EXPERIENCES: ExperienceLevel[] = ["NONE", "ONE_TO_THREE", "THREE_TO_SIX", "SIX_PLUS"];

type RawParams = Record<string, string | string[] | undefined>;

function list(v: string | string[] | undefined): string[] {
  if (!v) return [];
  const arr = Array.isArray(v) ? v : v.split(",");
  return arr.map((s) => s.trim()).filter(Boolean);
}

function pick<T extends string>(values: string[], allowed: readonly T[]): T[] {
  return values.filter((v): v is T => (allowed as readonly string[]).includes(v));
}

/** Разбор searchParams страницы или query API в типизированные фильтры. */
export function parseFilters(params: RawParams): VacancyFilters {
  const q = typeof params.q === "string" ? params.q.trim() : undefined;
  const city = typeof params.city === "string" ? params.city.trim() : undefined;
  const salaryRaw = typeof params.salary === "string" ? params.salary.replace(/\D/g, "") : "";
  const salaryFrom = salaryRaw ? Number(salaryRaw) : undefined;
  const expRaw = typeof params.exp === "string" ? params.exp : undefined;
  const pageRaw = typeof params.page === "string" ? Number(params.page) : 1;
  const sortRaw = typeof params.sort === "string" ? params.sort : "date";

  return {
    q: q || undefined,
    city: city || undefined,
    format: pick(list(params.format), FORMATS),
    grade: pick(list(params.grade), GRADES),
    experience: expRaw && (EXPERIENCES as string[]).includes(expRaw) ? (expRaw as ExperienceLevel) : undefined,
    employment: pick(list(params.employment), EMPLOYMENTS),
    salaryFrom: salaryFrom && Number.isFinite(salaryFrom) ? salaryFrom : undefined,
    skills: list(params.skills),
    sort: sortRaw === "salary" ? "salary" : "date",
    page: Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : 1,
  };
}

function buildWhere(f: VacancyFilters): Prisma.VacancyWhereInput {
  const where: Prisma.VacancyWhereInput = { status: "PUBLISHED" };
  const and: Prisma.VacancyWhereInput[] = [];

  if (f.q) {
    and.push({
      OR: [
        { title: { contains: f.q, mode: "insensitive" } },
        { company: { name: { contains: f.q, mode: "insensitive" } } },
        { skills: { some: { skill: { name: { contains: f.q, mode: "insensitive" } } } } },
      ],
    });
  }
  if (f.city) {
    const c = f.city.toLowerCase();
    if (c.startsWith("удал") || c === "remote") {
      and.push({ workFormat: { in: ["REMOTE", "REMOTE_OR_OFFICE"] } });
    } else {
      and.push({ city: { contains: f.city, mode: "insensitive" } });
    }
  }
  if (f.format?.length) {
    // «Удалённо» в фильтре должно ловить и REMOTE_OR_OFFICE
    const formats = new Set<WorkFormat>(f.format);
    if (formats.has("REMOTE") || formats.has("OFFICE")) formats.add("REMOTE_OR_OFFICE");
    and.push({ workFormat: { in: [...formats] } });
  }
  if (f.grade?.length) and.push({ grade: { in: f.grade } });
  if (f.experience) and.push({ experience: f.experience });
  if (f.employment?.length) and.push({ employment: { in: f.employment } });
  if (f.salaryFrom) {
    // Подходит, если верхняя граница вилки не ниже запрошенной суммы
    and.push({
      OR: [{ salaryTo: { gte: f.salaryFrom } }, { salaryTo: null, salaryFrom: { gte: f.salaryFrom } }],
    });
  }
  if (f.skills?.length) {
    for (const slug of f.skills) {
      and.push({ skills: { some: { skill: { slug } } } });
    }
  }

  if (and.length) where.AND = and;
  return where;
}

export const vacancyCardInclude = {
  company: { select: { slug: true, name: true, initials: true } },
  skills: { orderBy: { order: "asc" }, include: { skill: true } },
} satisfies Prisma.VacancyInclude;

export type VacancyCard = Prisma.VacancyGetPayload<{ include: typeof vacancyCardInclude }>;

export async function searchVacancies(f: VacancyFilters) {
  const where = buildWhere(f);
  const page = f.page ?? 1;
  const orderBy: Prisma.VacancyOrderByWithRelationInput[] =
    f.sort === "salary"
      ? [{ salaryTo: { sort: "desc", nulls: "last" } }, { salaryFrom: "desc" }]
      : [{ publishedAt: "desc" }];

  const [items, total] = await Promise.all([
    db.vacancy.findMany({
      where,
      include: vacancyCardInclude,
      orderBy,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.vacancy.count({ where }),
  ]);

  return { items, total, page, pageSize: PAGE_SIZE, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

/** Счётчики для фильтров: сколько вакансий по каждому формату и грейду. */
export async function facetCounts() {
  const [byFormat, byGrade] = await Promise.all([
    db.vacancy.groupBy({ by: ["workFormat"], where: { status: "PUBLISHED" }, _count: { _all: true } }),
    db.vacancy.groupBy({ by: ["grade"], where: { status: "PUBLISHED" }, _count: { _all: true } }),
  ]);
  const format: Record<WorkFormat, number> = { REMOTE: 0, HYBRID: 0, OFFICE: 0, REMOTE_OR_OFFICE: 0 };
  for (const r of byFormat) format[r.workFormat] = r._count._all;
  // «Удалённо или офис» засчитываем и в удалёнку, и в офис
  const remote = format.REMOTE + format.REMOTE_OR_OFFICE;
  const office = format.OFFICE + format.REMOTE_OR_OFFICE;
  const grade: Record<Grade, number> = { JUNIOR: 0, MIDDLE: 0, SENIOR: 0, LEAD: 0 };
  for (const r of byGrade) grade[r.grade] = r._count._all;
  return { format: { REMOTE: remote, HYBRID: format.HYBRID, OFFICE: office }, grade };
}

export async function popularSkills(limit = 12) {
  const rows = await db.vacancySkill.groupBy({
    by: ["skillId"],
    where: { vacancy: { status: "PUBLISHED" } },
    _count: { _all: true },
    orderBy: { _count: { skillId: "desc" } },
    take: limit,
  });
  if (!rows.length) return [];
  const skills = await db.skill.findMany({ where: { id: { in: rows.map((r) => r.skillId) } } });
  const order = new Map(rows.map((r, i) => [r.skillId, i]));
  return skills.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
}

export async function getVacancyBySlug(slug: string) {
  return db.vacancy.findFirst({
    where: { slug, status: "PUBLISHED" },
    include: {
      company: true,
      skills: { orderBy: { order: "asc" }, include: { skill: true } },
    },
  });
}

export async function countCompanyVacancies(companyId: string) {
  return db.vacancy.count({ where: { companyId, status: "PUBLISHED" } });
}

export async function similarVacancies(vacancyId: string, skillIds: string[], limit = 3) {
  return db.vacancy.findMany({
    where: {
      status: "PUBLISHED",
      id: { not: vacancyId },
      ...(skillIds.length ? { skills: { some: { skillId: { in: skillIds } } } } : {}),
    },
    include: vacancyCardInclude,
    orderBy: { publishedAt: "desc" },
    take: limit,
  });
}
