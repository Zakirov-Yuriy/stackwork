import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { siteUrl } from "@/lib/mail";
import { makeLabels, CURRENCY_SIGN } from "@/lib/labels";
import { delta, deltaText, type PeriodStats } from "@/lib/content/stats";

/** Карточка еженедельного дайджеста 1200×630 в стиле сайта: три цифры и стек недели */

const BG = "#e8ebf0", TEXT = "#2b3140", MUTED = "#6b7280", BLUE = "#3b6fd9", DARK = "#c6cbd4";
const L = makeLabels("ru");

let fontsCache: Promise<Array<{ name: string; data: Buffer; weight: 600 | 800 }>> | null = null;
function fonts() {
  fontsCache ??= Promise.all(
    ([["manrope-800.woff", 800], ["manrope-600.woff", 600]] as const).map(async ([file, weight]) => ({ name: "Manrope", data: await readFile(join(process.cwd(), "src/assets/fonts", file)), weight })),
  );
  return fontsCache;
}

export async function renderDigestCard(stats: PeriodStats, prev: PeriodStats): Promise<ImageResponse> {
  const fontList = await fonts();
  const share = (n: number) => (stats.total ? `${Math.round((n / stats.total) * 100)}%` : "—");
  const d = delta(stats.total, prev.total);
  const raised = `12px 12px 28px ${DARK}, -12px -12px 28px #ffffff`;
  const tile = (label: string, value: string, sub?: string) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1, padding: "26px 30px", borderRadius: 28, background: BG, boxShadow: raised }}>
      <div style={{ fontSize: 20, fontWeight: 600, color: MUTED, display: "flex", textTransform: "uppercase", letterSpacing: 1.5 }}>{label}</div>
      <div style={{ fontSize: 54, fontWeight: 800, color: TEXT, display: "flex", lineHeight: 1 }}>{value}</div>
      {sub ? <div style={{ fontSize: 20, fontWeight: 600, color: BLUE, display: "flex" }}>{sub}</div> : null}
    </div>
  );

  return new ImageResponse(
    (
      <div style={{ width: 1200, height: 630, display: "flex", background: BG, fontFamily: "Manrope", color: TEXT, padding: 56 }}>
        <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ fontSize: 26, fontWeight: 600, color: MUTED, display: "flex" }}>{`Итоги недели · ${stats.period.label}`}</div>
            <div style={{ fontSize: 52, fontWeight: 800, letterSpacing: -1, display: "flex" }}>IT-вакансии с зарплатой</div>
          </div>

          <div style={{ display: "flex", gap: 24, marginTop: 36 }}>
            {tile("Новых вакансий", L.nf.format(stats.total), d !== null ? `${deltaText(d)} к прошлой неделе` : undefined)}
            {tile("С зарплатой", share(stats.withSalary))}
            {tile("Удалённых", share(stats.remote))}
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginTop: 34 }}>
            {stats.stacks.slice(0, 4).map((s) => (
              <div key={s.slug} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 24, fontWeight: 600, padding: "12px 22px", borderRadius: 999, background: BG, boxShadow: `6px 6px 14px ${DARK}, -6px -6px 14px #ffffff` }}>
                <span style={{ fontWeight: 800 }}>{s.name}</span>
                <span style={{ color: MUTED }}>{`${s.count}${s.salary ? ` · ${L.nf.format(s.salary.median)} ${CURRENCY_SIGN[s.salary.currency] ?? s.salary.currency}${s.salary.period === "YEAR" ? "/год" : ""}` : ""}`}</span>
              </div>
            ))}
          </div>

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
