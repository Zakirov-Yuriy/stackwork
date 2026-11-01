import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import sharp from "sharp";
import { db } from "@/lib/db";
import { siteUrl } from "@/lib/mail";
import { makeLabels } from "@/lib/labels";
import { VACANCY_FOR_POST, type VacancyForPost } from "@/lib/telegram/post";

/**
 * Карточка вакансии 1200×630 в стиле сайта: логотип, должность, компания, зарплата, стек.
 * Используется как картинка поста в Telegram и как og:image страницы вакансии.
 */

const BG = "#e8ebf0", TEXT = "#2b3140", MUTED = "#6b7280", BLUE = "#3b6fd9", DARK = "#c6cbd4";
const L = makeLabels("ru");

let fontsCache: Promise<Array<{ name: string; data: Buffer; weight: 600 | 800 }>> | null = null;
function fonts() {
  fontsCache ??= Promise.all(
    // Один файл на начертание: латиница, кириллица и знаки валют вместе (склеено из сабсетов Fontsource)
    ([["manrope-800.woff", 800], ["manrope-600.woff", 600]] as const).map(async ([file, weight]) => ({ name: "Manrope", data: await readFile(join(process.cwd(), "src/assets/fonts", file)), weight })),
  );
  return fontsCache;
}

/** Логотип как data URL PNG 256px: внешние SVG и крупные файлы приводим к понятному satori виду */
async function logoDataUrl(url: string | null): Promise<string | null> {
  if (!url) return null;
  try {
    const abs = url.startsWith("/") ? siteUrl(url) : url;
    const res = await fetch(abs, { signal: AbortSignal.timeout(4000), headers: { "User-Agent": "Stackwork/1.0" } });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength > 3_000_000) return null;
    const png = await sharp(buf, { density: 200 }).resize(256, 256, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 0 } }).png().toBuffer();
    return `data:image/png;base64,${png.toString("base64")}`;
  } catch {
    return null;
  }
}

export type CardVacancy = VacancyForPost & { company: { name: string; logoUrl: string | null; initials: string | null } };

export async function loadCardVacancy(slug: string): Promise<CardVacancy | null> {
  return db.vacancy.findFirst({
    where: { slug, status: { in: ["PUBLISHED", "ARCHIVED"] } },
    select: { ...VACANCY_FOR_POST, company: { select: { name: true, logoUrl: true, initials: true } } },
  });
}

export async function renderVacancyCard(v: CardVacancy): Promise<ImageResponse> {
  const [fontList, logo] = await Promise.all([fonts(), logoDataUrl(v.company.logoUrl)]);
  const hasSalary = Boolean(v.salaryFrom || v.salaryTo);
  const salary = hasSalary ? `${L.formatSalary(v.salaryFrom, v.salaryTo, v.currency)}${L.periodSuffix(v.salaryPeriod, true)}` : "Зарплата по договорённости";
  const skills = v.skills.map((s) => s.skill.name).filter(Boolean).slice(0, 7);
  const title = v.title.length > 70 ? `${v.title.slice(0, 68).trim()}…` : v.title;
  const initials = (v.company.initials ?? v.company.name.slice(0, 2)).toUpperCase().slice(0, 2);
  const raised = `12px 12px 28px ${DARK}, -12px -12px 28px #ffffff`;

  return new ImageResponse(
    (
      <div style={{ width: 1200, height: 630, display: "flex", background: BG, fontFamily: "Manrope", color: TEXT, padding: 56 }}>
        <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 40 }}>
            <div style={{ width: 168, height: 168, borderRadius: 36, background: BG, boxShadow: raised, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" }}>
              {logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logo} width={128} height={128} alt="" style={{ objectFit: "contain" }} />
              ) : (
                <div style={{ fontSize: 64, fontWeight: 800, color: BLUE, display: "flex" }}>{initials}</div>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14, flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 54, fontWeight: 800, lineHeight: 1.1, letterSpacing: -1, display: "flex" }}>{title}</div>
              <div style={{ fontSize: 30, fontWeight: 600, color: MUTED, display: "flex" }}>
                {`${v.company.name} · ${L.formatLocation(v.city, v.workFormat, v.locationNote)}`}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 18, marginTop: 44 }}>
            <div style={{ fontSize: 40, fontWeight: 800, color: hasSalary ? BLUE : MUTED, display: "flex" }}>{salary}</div>
            <div style={{ fontSize: 26, fontWeight: 600, color: MUTED, display: "flex", padding: "8px 18px", borderRadius: 16, background: BG, boxShadow: `inset 4px 4px 10px ${DARK}, inset -4px -4px 10px #ffffff` }}>
              {`${L.GRADE_LABEL[v.grade]} · ${L.WORK_FORMAT_SHORT[v.workFormat]}`}
            </div>
          </div>

          {skills.length ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 28 }}>
              {skills.map((s) => (
                <div key={s} style={{ fontSize: 24, fontWeight: 600, padding: "10px 20px", borderRadius: 999, background: BG, color: TEXT, boxShadow: `6px 6px 14px ${DARK}, -6px -6px 14px #ffffff`, display: "flex" }}>
                  {s}
                </div>
              ))}
            </div>
          ) : null}

          <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: "auto" }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: BG, boxShadow: `5px 5px 12px ${DARK}, -5px -5px 12px #ffffff`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 800, color: BLUE }}>
              S
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, display: "flex" }}>stackwork</div>
            <div style={{ fontSize: 24, fontWeight: 600, color: MUTED, display: "flex", marginLeft: "auto" }}>{siteUrl("/").replace(/^https?:\/\//, "").replace(/\/$/, "")}</div>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630, fonts: fontList.map((f) => ({ name: f.name, data: f.data, weight: f.weight, style: "normal" as const })) },
  );
}
