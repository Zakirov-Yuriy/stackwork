import type { RawJob, SourceAdapter } from "../types";
import { fetchJson } from "../http";
import { isItJob } from "../classify";

/**
 * Hacker News «Ask HN: Who is hiring?»: ежемесячный тред, каждая вакансия — комментарий первого уровня.
 * Официальный открытый API: https://github.com/HackerNews/API (Firebase, без ключа).
 * Первая строка комментария обычно «Компания | Должность | Город | REMOTE | $150k-200k».
 */

type HnItem = { id: number; by?: string; time?: number; title?: string; text?: string; kids?: number[]; deleted?: boolean; dead?: boolean };

const API = "https://hacker-news.firebaseio.com/v0";

function decode(html: string): string {
  return html
    .replace(/&#x2F;/g, "/")
    .replace(/&#47;/g, "/")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<")
    .replace(/&amp;/g, "&");
}

function firstLine(text: string): string {
  return decode(text.replace(/<p>[\s\S]*$/i, "")).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

/** Из «Company | Senior Engineer | Remote (US) | $150k» достаём компанию и должность */
function parseHeader(line: string): { company: string; title: string; rest: string[] } | null {
  const parts = line.split(/\s*\|\s*/).map((p) => p.trim()).filter(Boolean);
  if (parts.length < 2) return null;
  const company = parts[0].replace(/\s*\((?:YC|yc)\s[^)]*\)/g, "").trim();
  // Должность: первая часть с ролевым словом, иначе вторая
  const roleIdx = parts.findIndex((p, i) => i > 0 && /engineer|developer|scientist|designer|manager|lead|architect|devops|sre|researcher|founding|cto|analyst|programmer/i.test(p));
  const title = (roleIdx > 0 ? parts[roleIdx] : parts[1]).replace(/^(hiring|looking for)\s+/i, "").slice(0, 150);
  if (company.length < 2 || company.length > 80 || title.length < 3) return null;
  return { company, title, rest: parts.filter((_, i) => i !== 0 && i !== (roleIdx > 0 ? roleIdx : 1)) };
}

function remoteOf(header: string[], text: string): { remote: boolean; note: string | null } {
  const h = header.join(" | ");
  if (/\b(onsite|on-site|in[- ]office)\s*only\b/i.test(h) || /\bno remote\b/i.test(text)) return { remote: false, note: null };
  const m = /\bremote\b\s*(?:\(([^)]+)\)|[-:,]?\s*((?:US|USA|EU|Europe|UK|Canada|LatAm|global|worldwide|anywhere|timezone|CET|EST|PST)[^|]*))?/i.exec(h) ?? /\bremote\b/i.exec(text.slice(0, 400));
  if (!m) return { remote: false, note: null };
  const note = (m[1] ?? m[2] ?? "").trim().slice(0, 60);
  return { remote: true, note: note || null };
}

function locationOf(header: string[]): string | null {
  const loc = header.find((p) => !/remote|\$|€|£|k\b|full[- ]time|part[- ]time|contract|intern|visa|hybrid|onsite|on-site/i.test(p) && /^[A-Z][A-Za-z.\s,-]{2,40}$/.test(p));
  return loc ?? null;
}

export const hackernews: SourceAdapter = {
  source: "HACKERNEWS",
  label: "HN Who is hiring",
  homepage: "https://news.ycombinator.com",
  staleDays: 45,
  terms: "Официальный API Hacker News. Ссылка на комментарий в треде.",
  async fetch({ limit, maxAgeDays, log, deadline, remoteOnly }) {
    const out: RawJob[] = [];
    const minDate = Date.now() - maxAgeDays * 86_400_000;
    const user = await fetchJson<{ submitted?: number[] }>(`${API}/user/whoishiring.json`);
    const threads: HnItem[] = [];
    for (const id of (user.submitted ?? []).slice(0, 12)) {
      const it = await fetchJson<HnItem>(`${API}/item/${id}.json`);
      if (it?.title?.includes("Who is hiring")) threads.push(it);
      if (threads.length >= 2) break;
    }
    for (const t of threads) {
      const kids = t.kids ?? [];
      let taken = 0;
      for (let i = 0; i < kids.length; i += 25) {
        if (deadline && Date.now() > deadline) {
          log(`лимит времени на «${t.title}»`);
          return out;
        }
        const batch = await Promise.all(kids.slice(i, i + 25).map((k) => fetchJson<HnItem>(`${API}/item/${k}.json`).catch(() => null)));
        for (const c of batch) {
          if (!c?.text || c.deleted || c.dead) continue;
          const publishedAt = new Date((c.time ?? 0) * 1000);
          if (publishedAt.getTime() < minDate) continue;
          const header = parseHeader(firstLine(c.text));
          if (!header) continue;
          const text = decode(c.text).replace(/<[^>]+>/g, " ");
          const { remote, note } = remoteOf(header.rest, text);
          if (remoteOnly && !remote) continue;
          if (!isItJob(header.title, header.rest)) continue;
          const link = /href="([^"]+)"/.exec(c.text)?.[1];
          const apply = link ? decode(link) : `https://news.ycombinator.com/item?id=${c.id}`;
          const salary = /\$\s?\d{2,3}\s?k?\s?[-–]\s?\$?\s?\d{2,3}\s?k/i.exec(header.rest.join(" "))?.[0] ?? null;
          out.push({
            source: "HACKERNEWS",
            externalId: String(c.id),
            externalUrl: `https://news.ycombinator.com/item?id=${c.id}`,
            applyUrl: apply,
            title: header.title,
            companyName: header.company,
            descriptionHtml: `<p>${decode(c.text)}</p>`,
            tags: header.rest,
            publishedAt,
            salary: salary ? { text: salary } : null,
            remote,
            location: remote ? null : locationOf(header.rest),
            locationNote: note,
            employment: /\b(contract|freelance)\b/i.test(header.rest.join(" ")) ? "CONTRACT" : /\bpart[- ]time\b/i.test(header.rest.join(" ")) ? "PART_TIME" : "FULL_TIME",
            language: "en",
          });
          taken++;
          if (out.length >= limit) return out;
        }
      }
      log(`${t.title}: ${kids.length} комментариев, взято ${taken}`);
    }
    return out;
  },
};
