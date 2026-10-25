import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { plural } from "@/lib/labels";

export const metadata: Metadata = {
  title: "Зарплаты по стеку",
  description: "Медианные зарплатные вилки по технологиям из опубликованных вакансий Stackwork.",
};

const nf = new Intl.NumberFormat("ru-RU");

function median(xs: number[]) {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
}

export default async function SalariesPage() {
  // Берём только рублёвые вакансии с указанной вилкой; середина вилки как оценка
  const rows = await db.vacancySkill.findMany({
    where: { vacancy: { status: "PUBLISHED", currency: "RUB", OR: [{ salaryFrom: { not: null } }, { salaryTo: { not: null } }] } },
    select: { skill: { select: { slug: true, name: true } }, vacancy: { select: { salaryFrom: true, salaryTo: true } } },
  });

  const bySkill = new Map<string, { name: string; slug: string; mids: number[]; froms: number[]; tos: number[] }>();
  for (const r of rows) {
    const from = r.vacancy.salaryFrom ?? r.vacancy.salaryTo!;
    const to = r.vacancy.salaryTo ?? r.vacancy.salaryFrom!;
    const e = bySkill.get(r.skill.slug) ?? { name: r.skill.name, slug: r.skill.slug, mids: [], froms: [], tos: [] };
    e.mids.push(Math.round((from + to) / 2));
    e.froms.push(from);
    e.tos.push(to);
    bySkill.set(r.skill.slug, e);
  }
  const stats = [...bySkill.values()]
    .map((e) => ({ ...e, count: e.mids.length, median: median(e.mids)!, from: median(e.froms)!, to: median(e.tos)! }))
    .sort((a, b) => b.count - a.count || b.median - a.median);
  const max = Math.max(1, ...stats.map((s) => s.to));

  return (
    <>
      <SiteHeader />
      <main className="mx-auto box-border flex w-full max-w-[1180px] flex-1 flex-col gap-7 px-6 pb-14 pt-8">
        <div className="flex max-w-[760px] flex-col gap-2">
          <h1 className="m-0 text-[36px] font-extrabold leading-tight tracking-tight">Зарплаты по стеку</h1>
          <p className="m-0 text-[16px] leading-relaxed text-[color:var(--soft-muted)]">
            Медиана зарплатных вилок из опубликованных вакансий в рублях на руки. Чем больше вакансий с технологией, тем точнее цифра.
          </p>
        </div>

        {stats.length === 0 ? (
          <div className="neu-card-sm p-8 text-sm text-[color:var(--soft-muted)]">Пока недостаточно вакансий с указанной зарплатой.</div>
        ) : (
          <div className="neu-card flex flex-col gap-1 p-6">
            <div className="hidden grid-cols-[1fr_2fr_auto] gap-4 px-3 pb-2 text-[12px] font-extrabold uppercase tracking-[0.08em] text-[color:var(--soft-muted)] sm:grid">
              <span>Технология</span>
              <span>Типичная вилка</span>
              <span className="text-right">Вакансий</span>
            </div>
            {stats.map((s) => (
              <Link
                key={s.slug}
                href={`/?skills=${s.slug}`}
                className="grid grid-cols-1 items-center gap-2 rounded-xl px-3 py-3 text-[color:var(--soft-text)] hover:bg-[color:var(--soft-bg-raised)] sm:grid-cols-[1fr_2fr_auto] sm:gap-4"
              >
                <span className="font-mono text-[15px] font-semibold">{s.name}</span>
                <span className="flex items-center gap-3">
                  <span className="neu-inset relative h-3 flex-1 overflow-hidden rounded-full">
                    <span
                      className="absolute inset-y-0 rounded-full bg-[linear-gradient(135deg,#5a8df2,#2d62d0)]"
                      style={{ left: `${(s.from / max) * 100}%`, width: `${Math.max(2, ((s.to - s.from) / max) * 100)}%` }}
                    />
                  </span>
                  <span className="whitespace-nowrap font-mono text-sm font-semibold">
                    {nf.format(s.from)} – {nf.format(s.to)} ₽
                  </span>
                </span>
                <span className="text-sm text-[color:var(--soft-muted)] sm:text-right">
                  {s.count} {plural(s.count, "вакансия", "вакансии", "вакансий")}
                </span>
              </Link>
            ))}
          </div>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
