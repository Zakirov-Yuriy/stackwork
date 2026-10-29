import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/guards";
import type { Prisma, UserRole } from "@/generated/prisma/client";
import { PageHeader, Card, Table, Badge, Empty, Pagination, btn, nf, dateTime } from "@/components/admin/ui";
import { setRoleAction } from "./actions";

export const metadata: Metadata = { title: "Пользователи" };
const PAGE = 30;
const ROLES: UserRole[] = ["CANDIDATE", "EMPLOYER", "ADMIN"];
const ROLE_LABEL: Record<UserRole, string> = { CANDIDATE: "Соискатель", EMPLOYER: "Работодатель", ADMIN: "Администратор" };

export default async function UsersPage(props: PageProps<"/admin/users">) {
  const me = await requireRole("ADMIN", "/admin/users");
  const sp = await props.searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const role = typeof sp.role === "string" && (ROLES as string[]).includes(sp.role) ? (sp.role as UserRole) : undefined;
  const page = Math.max(1, Number(typeof sp.page === "string" ? sp.page : 1) || 1);
  const where: Prisma.UserWhereInput = {
    ...(role ? { role } : {}),
    ...(q ? { OR: [{ email: { contains: q, mode: "insensitive" } }, { name: { contains: q, mode: "insensitive" } }] } : {}),
  };
  const [items, total, byRole] = await Promise.all([
    db.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE,
      take: PAGE,
      select: { id: true, email: true, name: true, role: true, createdAt: true, company: { select: { name: true, slug: true } }, _count: { select: { applications: true, vacancies: true } } },
    }),
    db.user.count({ where }),
    db.user.groupBy({ by: ["role"], _count: { _all: true } }),
  ]);
  const counts = Object.fromEntries(byRole.map((r) => [r.role, r._count._all])) as Record<string, number>;
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const query = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ q: q || undefined, role, page: String(page), ...patch })) if (v && !(k === "page" && v === "1")) p.set(k, v);
    const s = p.toString();
    return s ? `/admin/users?${s}` : "/admin/users";
  };

  return (
    <>
      <PageHeader title="Пользователи" subtitle={`Соискателей ${nf.format(counts.CANDIDATE ?? 0)}, работодателей ${nf.format(counts.EMPLOYER ?? 0)}, администраторов ${nf.format(counts.ADMIN ?? 0)}`} />

      <Card className="mb-4">
        <form method="get" className="flex flex-wrap items-end gap-3">
          <label className="flex min-w-[220px] flex-[2_1_220px] flex-col gap-1 text-xs font-semibold uppercase tracking-wide">
            Поиск
            <input name="q" defaultValue={q} placeholder="Почта или имя" className="a-input" />
          </label>
          <label className="flex min-w-[160px] flex-1 flex-col gap-1 text-xs font-semibold uppercase tracking-wide">
            Роль
            <select name="role" defaultValue={role ?? ""} className="a-select">
              <option value="">Все</option>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABEL[r]}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className={btn("primary")}>
            Показать
          </button>
          {q || role ? (
            <Link href="/admin/users" className={btn("ghost")}>
              Сбросить
            </Link>
          ) : null}
        </form>
      </Card>

      <Card padded={false}>
        {items.length === 0 ? (
          <Empty>Никого не нашлось.</Empty>
        ) : (
          <Table>
            <thead>
              <tr>
                <th>Пользователь</th>
                <th>Роль</th>
                <th>Компания</th>
                <th className="text-right">Отклики</th>
                <th className="text-right">Вакансии</th>
                <th>Зарегистрирован</th>
                <th>Сменить роль</th>
              </tr>
            </thead>
            <tbody>
              {items.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div className="font-medium text-[var(--a-heading)]">{u.name ?? "–"}</div>
                    <div className="text-xs text-[var(--a-muted)]">{u.email}</div>
                  </td>
                  <td>
                    <Badge tone={u.role === "ADMIN" ? "danger" : u.role === "EMPLOYER" ? "primary" : "secondary"}>{ROLE_LABEL[u.role]}</Badge>
                  </td>
                  <td>{u.company ? <Link href={`/companies/${u.company.slug}`} className="a-link">{u.company.name}</Link> : "–"}</td>
                  <td className="text-right">{u._count.applications}</td>
                  <td className="text-right">{u._count.vacancies}</td>
                  <td className="whitespace-nowrap">{dateTime(u.createdAt)}</td>
                  <td>
                    {u.id === me.id ? (
                      <span className="text-xs text-[var(--a-muted)]">это вы</span>
                    ) : (
                      <form action={setRoleAction} className="flex items-center gap-1">
                        <input type="hidden" name="id" value={u.id} />
                        <input type="hidden" name="back" value={query({})} />
                        <select name="role" defaultValue={u.role} className="a-select !min-h-8 !w-auto !py-1 text-xs">
                          {ROLES.map((r) => (
                            <option key={r} value={r}>
                              {ROLE_LABEL[r]}
                            </option>
                          ))}
                        </select>
                        <button type="submit" className={btn("outline", "sm")}>
                          Сохранить
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
        <Pagination page={page} pages={pages} href={(p) => query({ page: String(p) })} />
      </Card>
    </>
  );
}
