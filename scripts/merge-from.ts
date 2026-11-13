/**
 * Перенос пользовательских данных из старой базы в текущую (например, из Neon в Supabase).
 *
 *   SOURCE_DATABASE_URL="<старая база>" DATABASE_URL="<новая база>" pnpm db:merge-from
 *   PowerShell: $env:SOURCE_DATABASE_URL="…"; $env:DATABASE_URL="…"; pnpm db:merge-from
 *
 * Переносятся: пользователи (слияние по почте), компании работодателей и логотипы (по slug),
 * заявки на компании, ручные вакансии работодателей с навыками, отклики, сохранённые вакансии,
 * жалобы, устройства для push, настройки сайта, черновики контента, отметки о постах в Telegram.
 * Импортированные вакансии не переносятся: их заново заливает импорт; сохранённые и жалобы по ним
 * привязываются к вакансии с тем же slug в новой базе, если она уже импортирована.
 * Скрипт идемпотентен: повторный запуск ничего не дублирует. Старая база только читается.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

function client(url: string | undefined, name: string) {
  if (!url) throw new Error(`${name} не задан`);
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
}

const src = client(process.env.SOURCE_DATABASE_URL, "SOURCE_DATABASE_URL");
const dst = client(process.env.DATABASE_URL, "DATABASE_URL");

const stats: Record<string, { added: number; merged: number; skipped: number }> = {};
function tick(table: string, what: "added" | "merged" | "skipped") {
  stats[table] ??= { added: 0, merged: 0, skipped: 0 };
  stats[table][what] += 1;
}

async function main() {
  // 1. Навыки: по slug, нужны для ручных вакансий
  const skillId = new Map<string, string>(); // старый id -> новый id
  for (const s of await src.skill.findMany()) {
    const existing = await dst.skill.findUnique({ where: { slug: s.slug }, select: { id: true } });
    if (existing) {
      skillId.set(s.id, existing.id);
      tick("Skill", "merged");
    } else {
      const created = await dst.skill.create({ data: { id: s.id, slug: s.slug, name: s.name } });
      skillId.set(s.id, created.id);
      tick("Skill", "added");
    }
  }

  // 2. Компании: по slug. Компании-источники импорта в новой базе уже могут быть (slug совпадает)
  const companyId = new Map<string, string>();
  const srcCompanies = await src.company.findMany({ include: { logo: true } });
  for (const c of srcCompanies) {
    const existing = await dst.company.findUnique({ where: { slug: c.slug }, select: { id: true } });
    if (existing) {
      companyId.set(c.id, existing.id);
      tick("Company", "merged");
      continue;
    }
    const { logo, ...data } = c;
    // nameKey уникален: если занят другой компанией в новой базе, не копируем его
    const nameKeyTaken = data.nameKey ? await dst.company.findUnique({ where: { nameKey: data.nameKey }, select: { id: true } }) : null;
    const created = await dst.company.create({ data: { ...data, nameKey: nameKeyTaken ? null : data.nameKey } });
    companyId.set(c.id, created.id);
    if (logo) await dst.companyLogo.create({ data: { companyId: created.id, data: logo.data, mime: logo.mime } });
    tick("Company", "added");
  }

  // 3. Пользователи: слияние по почте, id старой базы сохраняем, если почты в новой нет
  const userId = new Map<string, string>();
  for (const u of await src.user.findMany()) {
    const existing = await dst.user.findUnique({ where: { email: u.email }, select: { id: true, companyId: true, role: true } });
    if (existing) {
      userId.set(u.id, existing.id);
      // Работодателю без компании в новой базе проставляем его компанию из старой
      if (!existing.companyId && u.companyId && companyId.get(u.companyId)) {
        await dst.user.update({ where: { id: existing.id }, data: { companyId: companyId.get(u.companyId), role: u.role } });
      }
      tick("User", "merged");
      continue;
    }
    const created = await dst.user.create({ data: { ...u, companyId: u.companyId ? (companyId.get(u.companyId) ?? null) : null } });
    userId.set(u.id, created.id);
    tick("User", "added");
  }

  // 4. Заявки на компании
  for (const cl of await src.companyClaim.findMany()) {
    const cId = companyId.get(cl.companyId);
    const uId = userId.get(cl.userId);
    if (!cId || !uId) {
      tick("CompanyClaim", "skipped");
      continue;
    }
    const exists = await dst.companyClaim.findUnique({ where: { companyId_userId: { companyId: cId, userId: uId } }, select: { id: true } });
    if (exists) {
      tick("CompanyClaim", "merged");
      continue;
    }
    await dst.companyClaim.create({ data: { ...cl, companyId: cId, userId: uId } });
    tick("CompanyClaim", "added");
  }

  // 5. Ручные вакансии работодателей (импортированные заливает импорт)
  const vacancyId = new Map<string, string>();
  const manual = await src.vacancy.findMany({ where: { source: "MANUAL" }, include: { skills: true } });
  for (const v of manual) {
    const existing = await dst.vacancy.findUnique({ where: { slug: v.slug }, select: { id: true } });
    if (existing) {
      vacancyId.set(v.id, existing.id);
      tick("Vacancy", "merged");
      continue;
    }
    const { skills, ...data } = v;
    const cId = companyId.get(v.companyId);
    if (!cId) {
      tick("Vacancy", "skipped");
      continue;
    }
    const created = await dst.vacancy.create({
      data: { ...data, companyId: cId, authorId: v.authorId ? (userId.get(v.authorId) ?? null) : null },
    });
    vacancyId.set(v.id, created.id);
    for (const vs of skills) {
      const sId = skillId.get(vs.skillId);
      if (sId) await dst.vacancySkill.create({ data: { vacancyId: created.id, skillId: sId, order: vs.order } });
    }
    tick("Vacancy", "added");
  }

  // Импортированные вакансии: ищем в новой базе по slug, чтобы привязать сохранённые, жалобы и посты
  async function targetVacancy(oldId: string): Promise<string | null> {
    const mapped = vacancyId.get(oldId);
    if (mapped) return mapped;
    const old = await src.vacancy.findUnique({ where: { id: oldId }, select: { slug: true } });
    if (!old) return null;
    const found = await dst.vacancy.findUnique({ where: { slug: old.slug }, select: { id: true } });
    if (found) vacancyId.set(oldId, found.id);
    return found?.id ?? null;
  }

  // 6. Отклики (только на ручные вакансии, иначе их не бывает)
  for (const a of await src.application.findMany()) {
    const vId = await targetVacancy(a.vacancyId);
    const cId = userId.get(a.candidateId);
    if (!vId || !cId) {
      tick("Application", "skipped");
      continue;
    }
    const exists = await dst.application.findUnique({ where: { vacancyId_candidateId: { vacancyId: vId, candidateId: cId } }, select: { id: true } });
    if (exists) {
      tick("Application", "merged");
      continue;
    }
    await dst.application.create({ data: { ...a, vacancyId: vId, candidateId: cId } });
    tick("Application", "added");
  }

  // 7. Сохранённые вакансии
  for (const s of await src.savedVacancy.findMany()) {
    const vId = await targetVacancy(s.vacancyId);
    const uId = userId.get(s.userId);
    if (!vId || !uId) {
      tick("SavedVacancy", "skipped");
      continue;
    }
    const exists = await dst.savedVacancy.findUnique({ where: { userId_vacancyId: { userId: uId, vacancyId: vId } } });
    if (exists) {
      tick("SavedVacancy", "merged");
      continue;
    }
    await dst.savedVacancy.create({ data: { userId: uId, vacancyId: vId, createdAt: s.createdAt } });
    tick("SavedVacancy", "added");
  }

  // 8. Жалобы
  for (const r of await src.report.findMany()) {
    const vId = await targetVacancy(r.vacancyId);
    if (!vId) {
      tick("Report", "skipped");
      continue;
    }
    const exists = await dst.report.findUnique({ where: { id: r.id }, select: { id: true } });
    if (exists) {
      tick("Report", "merged");
      continue;
    }
    await dst.report.create({ data: { ...r, vacancyId: vId, userId: r.userId ? (userId.get(r.userId) ?? null) : null } });
    tick("Report", "added");
  }

  // 9. Устройства для push
  for (const d of await src.deviceToken.findMany()) {
    const uId = userId.get(d.userId);
    if (!uId) {
      tick("DeviceToken", "skipped");
      continue;
    }
    await dst.deviceToken.upsert({ where: { token: d.token }, create: { ...d, userId: uId }, update: { userId: uId, lastSeenAt: d.lastSeenAt } });
    tick("DeviceToken", "added");
  }

  // 10. Настройки сайта (Telegram, дайджест и т. п.): старые значения не перекрывают уже заданные в новой базе
  for (const s of await src.setting.findMany()) {
    const exists = await dst.setting.findUnique({ where: { key: s.key } });
    if (exists) {
      tick("Setting", "merged");
      continue;
    }
    await dst.setting.create({ data: { key: s.key, value: s.value as object } });
    tick("Setting", "added");
  }

  // 11. Черновики контента и отметки о постах в Telegram (чтобы бот не постил те же вакансии второй раз)
  for (const c of await src.contentDraft.findMany()) {
    const exists = await dst.contentDraft.findUnique({ where: { id: c.id }, select: { id: true } });
    if (exists) {
      tick("ContentDraft", "merged");
      continue;
    }
    await dst.contentDraft.create({ data: { ...c, data: c.data as object } });
    tick("ContentDraft", "added");
  }
  for (const p of await src.telegramPost.findMany()) {
    const vId = await targetVacancy(p.vacancyId);
    if (!vId) {
      tick("TelegramPost", "skipped");
      continue;
    }
    const exists = await dst.telegramPost.findUnique({ where: { vacancyId: vId }, select: { id: true } });
    if (exists) {
      tick("TelegramPost", "merged");
      continue;
    }
    await dst.telegramPost.create({ data: { ...p, vacancyId: vId } });
    tick("TelegramPost", "added");
  }

  console.log("Перенос завершён. Таблица: добавлено / уже было / пропущено (нет связанной записи)");
  for (const [table, s] of Object.entries(stats)) console.log(`  ${table.padEnd(14)} ${s.added} / ${s.merged} / ${s.skipped}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await src.$disconnect();
    await dst.$disconnect();
  });
