import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { siteUrl } from "@/lib/mail";
import { makeLabels, CURRENCY_SIGN } from "@/lib/labels";
import type { PeriodStats } from "@/lib/content/stats";

/** Горизонтальные полосы 25–75 процентиль с меткой медианы по стекам, для статьи за месяц */

const BG = "#e8ebf0", TEXT = "#2b3140", MUTED = "#6b7280", BLUE = "#3b6fd9", DARK = "#c6cbd4";
const L = makeLabels("ru");

let fontsCache: Promise<Array<{ name: string; data: Buffer; weight: 600 | 800 }>> | null = null;
function fonts() {
  fontsCache ??= Promise.all(
    ([["manrope-800.woff", 800], ["manrope-600.woff", 600]] as const).map(async ([file, weight]) => ({ name: "Manrope", data: await readFile(join(process.cwd(), "src/assets/fonts", file)), weight })),
  );
  return fontsCache;
}

export async function renderReportChart(stats: PeriodStats, currency: "USD" | "RUB"): Promise<ImageResponse> {
  const fontList = await fonts();
  const rows = stats.stacks
    .map((s) => ({ name: s.name, count: s.count, stat: currency === "USD" ? s.salaryUsd : s.salaryRub }))
    .filter((r) => r.stat && r.stat.count >= 5)
    .sort((a, b) => (b.stat?.median ?? 0) - (a.stat?.median ?? 0))
    .slice(0, 12);
  const max = Math.max(1, ...rows.map((r) => r.stat!.p75)) * 1.08;
  const rowH = 52;
  const height = 150 + rows.length * rowH + 90;
  const sign = CURRENCY_SIGN[currency];
  const unit = currency === "USD" ? "в год" : "в месяц";

  return new ImageResponse(
    (
      <div style={{ width: 1200, height, display: "flex", background: BG, fontFamily: "Manrope", color: TEXT, padding: "48px 56px" }}>
        <div style={{ display: "flex", flexDirection: "column", width: "100%" }}>
          <div style={{ fontSize: 36, fontWeight: 800, display: "flex", letterSpacing: -0.5 }}>{`Медианные зарплаты по стеку, ${stats.period.label}`}</div>
          <div style={{ fontSize: 20, fontWeight: 600, color: MUTED, display: "flex", marginTop: 6 }}>{`${currency === "USD" ? "Доллары" : "Рубли"}, ${unit} · полоса 25–75 процентиль, метка медиана · число вакансий с зарплатой справа`}</div>
          <div style={{ display: "flex", flexDirection: "column", marginTop: 28 }}>
            {rows.map((r) => (
              <div key={r.name} style={{ display: "flex", alignItems: "center", height: rowH }}>
                <div style={{ width: 170, fontSize: 22, fontWeight: 800, display: "flex" }}>{r.name}</div>
                <div style={{ flex: 1, height: 18, borderRadius: 9, background: "#dde1e8", display: "flex", position: "relative", boxShadow: `inset 3px 3px 6px ${DARK}, inset -3px -3px 6px #ffffff` }}>
                  <div style={{ position: "absolute", left: `${(r.stat!.p25 / max) * 100}%`, width: `${Math.max(0.8, ((r.stat!.p75 - r.stat!.p25) / max) * 100)}%`, top: 0, bottom: 0, borderRadius: 9, background: BLUE, display: "flex" }} />
                  <div style={{ position: "absolute", left: `${(r.stat!.median / max) * 100}%`, width: 4, top: -4, bottom: -4, borderRadius: 2, background: TEXT, display: "flex" }} />
                </div>
                <div style={{ width: 230, fontSize: 21, fontWeight: 600, display: "flex", justifyContent: "flex-end", color: TEXT }}>{`${L.nf.format(r.stat!.median)} ${sign}`}</div>
                <div style={{ width: 70, fontSize: 19, fontWeight: 600, display: "flex", justifyContent: "flex-end", color: MUTED }}>{String(r.stat!.count)}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: "auto" }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: BG, boxShadow: `4px 4px 10px ${DARK}, -4px -4px 10px #ffffff`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 800, color: BLUE }}>
              S
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, display: "flex" }}>stackwork</div>
            <div style={{ fontSize: 19, fontWeight: 600, color: MUTED, display: "flex", marginLeft: "auto" }}>{siteUrl("/").replace(/^https?:\/\//, "").replace(/\/$/, "")}</div>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height, fonts: fontList.map((f) => ({ name: f.name, data: f.data, weight: f.weight, style: "normal" as const })) },
  );
}
