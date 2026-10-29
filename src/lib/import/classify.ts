import type { Grade, ExperienceLevel, SalaryPeriod } from "@/generated/prisma/client";

/* ───────────────────────────── IT или нет ─────────────────────────────
 * Сайт только для IT, поэтому вакансия проходит, если в названии есть
 * инженерная роль и нет явно не-IT роли. Теги источника добавляют уверенности.
 */

const IT_TITLE =
  /\b(developer|engineer|engineering|programmer|architect|devops|sre|site reliability|data scientist|data analyst|analytics|machine learning|ml\b|ai\b|llm|qa\b|quality assurance|sdet|tester|test automation|automation|security|pentest|appsec|cto|tech lead|team lead|full[- ]?stack|front[- ]?end|back[- ]?end|mobile|ios|android|flutter|react|angular|vue|node|python|golang|java\b|kotlin|swift|rust|scala|\.net|c#|c\+\+|php|ruby|elixir|typescript|javascript|sql|database|dba|cloud|kubernetes|platform|infrastructure|embedded|firmware|blockchain|solidity|web3|game|unity|unreal|product manager|project manager|scrum master|delivery manager|engineering manager|system analyst|business analyst|bi\b|etl|data engineer|solutions? (engineer|architect)|technical (lead|writer|support)|support engineer|release|build engineer|network engineer|sysadmin|system administrator|linux)\b/i;

const NOT_IT_TITLE =
  /\b(sales|account (executive|manager)|business development|sdr|bdr|marketing|growth|seo\b|content (writer|creator|marketer)|copywriter|social media|community manager|recruiter|recruiting|talent|hr\b|people (ops|partner)|customer (success|support|service|care)|virtual assistant|executive assistant|office manager|operations manager|finance|accountant|accounting|bookkeep|payroll|legal|counsel|paralegal|nurse|physician|therapist|teacher|tutor|coach|designer|ux|ui\/ux|illustrator|video editor|translator|interpreter|transcri|data entry|clinical|medical|real estate|insurance|underwrit|collections|dispatcher|driver|warehouse|chef|barista|retail|cashier|brand|pr manager|partnership|affiliate|influencer|enrollment|admissions|fundrais|grant writer|event)\b/i;

const HARD_NO =
  /\b(sales engineer|pre-?sales|solutions? engineer|solutions? consultant|customer engineer|electrical engineer|mechanical engineer|civil engineer|hardware engineer|marketing engineer|rater|annotat\w*|labell?ing|transcri\w*|moderator|evaluator|product lead|design lead)\b/i;

/** Теги, которым верим, когда название ничего не говорит */
const STRONG_TAGS = /(software|engineer|developer|devops|backend|frontend|full ?stack|programm|sre|data engineering|machine learning)/i;

export function isItJob(title: string, tags: string[]): boolean {
  const t = title.trim();
  if (HARD_NO.test(t)) return false;
  if (NOT_IT_TITLE.test(t) && !/\b(engineer|developer|architect)\b/i.test(t)) return false;
  if (IT_TITLE.test(t)) return true;
  // Название ничего не говорит («Специалист»), доверяем только сильным тегам источника
  return tags.some((tag) => STRONG_TAGS.test(tag)) && !NOT_IT_TITLE.test(t);
}

/* ───────────────────────────── Направление ───────────────────────────── */

const DIRECTION_RULES: Array<[RegExp, string]> = [
  [/\b(devops|sre|site reliability|platform engineer|infrastructure|cloud engineer|kubernetes|sysadmin|system administrator|network engineer|release engineer|build engineer)\b/i, "DevOps / SRE"],
  [/\b(data (engineer|scientist|analyst)|machine learning|ml engineer|ai engineer|ai\/ml|llm|deep learning|analytics engineer|etl|bi (developer|engineer)|data\b)/i, "Data / ML"],
  [/\b(qa|quality assurance|sdet|tester|test automation|test engineer|automation engineer)\b/i, "QA"],
  [/\b(security|pentest|appsec|infosec|soc analyst)\b/i, "Безопасность"],
  [/\b(product manager|project manager|engineering manager|scrum master|delivery manager|head of|director of engineering|cto|vp of engineering|product owner)\b/i, "Менеджмент"],
  [/\b(business analyst|system analyst|systems analyst|analyst)\b/i, "Аналитика"],
  [/\b(mobile|ios|android|flutter|react native|swift|kotlin)\b/i, "Mobile"],
  [/\b(full[- ]?stack)\b/i, "Fullstack"],
  [/\b(front[- ]?end|react|angular|vue|svelte|web developer|ui developer|javascript developer|typescript developer)\b/i, "Frontend"],
  [/\b(back[- ]?end|api|server|golang|go developer|python|java|kotlin|php|ruby|rails|django|\.net|c#|node|elixir|rust|scala|laravel|spring)\b/i, "Backend"],
  [/\b(embedded|firmware|c\+\+|hardware|fpga)\b/i, "Embedded"],
  [/\b(game|unity|unreal)\b/i, "GameDev"],
];

export function detectDirection(title: string, tags: string[]): string {
  for (const [re, dir] of DIRECTION_RULES) if (re.test(title)) return dir;
  const joined = tags.join(" ");
  for (const [re, dir] of DIRECTION_RULES) if (re.test(joined)) return dir;
  return "Разработка";
}

/* ───────────────────────────── Грейд и опыт ───────────────────────────── */

const JUNIOR_RE = /\b(intern|internship|trainee|junior|jr\.?|entry[- ]level|graduate|associate)\b/i;
const LEAD_RE = /\b(lead|principal|staff|head|director|architect|cto|vp|manager|chief)\b/i;
const SENIOR_RE = /\b(senior|sr\.?|expert|iii|iv)\b/i;
const MIDDLE_RE = /\b(middle|mid[- ]level|mid|ii)\b/i;

/** Сначала смотрим на название, подсказка источника только если название молчит */
export function detectGrade(title: string, hint?: string | null): Grade {
  for (const t of [title, hint ?? ""]) {
    if (!t) continue;
    if (JUNIOR_RE.test(t)) return "JUNIOR";
    if (LEAD_RE.test(t)) return "LEAD";
    if (SENIOR_RE.test(t)) return "SENIOR";
    if (MIDDLE_RE.test(t)) return "MIDDLE";
  }
  return "MIDDLE";
}

export function experienceForGrade(grade: Grade, title: string): ExperienceLevel {
  if (/\b(intern|internship|trainee|entry[- ]level|graduate)\b/i.test(title)) return "NONE";
  switch (grade) {
    case "JUNIOR":
      return "ONE_TO_THREE";
    case "MIDDLE":
      return "ONE_TO_THREE";
    case "SENIOR":
      return "THREE_TO_SIX";
    case "LEAD":
      return "SIX_PLUS";
  }
}

/* ───────────────────────────── Стек ─────────────────────────────
 * Канонические имена и их написания в тегах, названиях и описаниях.
 * Короткие имена (Go, C, R) ищем только в тегах и названии.
 */

const TECH: Array<[string, string[]]> = [
  ["Python", ["python"]],
  ["Go", ["go", "golang"]],
  ["TypeScript", ["typescript", "ts"]],
  ["JavaScript", ["javascript", "js"]],
  ["Java", ["java"]],
  ["Kotlin", ["kotlin"]],
  ["Swift", ["swift"]],
  ["C#", ["c#", "csharp"]],
  [".NET", [".net", "dotnet", "asp.net"]],
  ["C++", ["c++", "cpp"]],
  ["C", ["c"]],
  ["Rust", ["rust"]],
  ["Scala", ["scala"]],
  ["PHP", ["php"]],
  ["Ruby", ["ruby", "ruby on rails", "rails"]],
  ["Elixir", ["elixir", "phoenix"]],
  ["Dart", ["dart"]],
  ["Flutter", ["flutter"]],
  ["React", ["react", "reactjs", "react.js"]],
  ["React Native", ["react native", "react-native"]],
  ["Next.js", ["next.js", "nextjs", "next"]],
  ["Vue", ["vue", "vuejs", "vue.js", "nuxt"]],
  ["Angular", ["angular", "angularjs"]],
  ["Svelte", ["svelte", "sveltekit"]],
  ["Node.js", ["node", "nodejs", "node.js"]],
  ["NestJS", ["nestjs", "nest.js"]],
  ["Express", ["express", "expressjs"]],
  ["Django", ["django"]],
  ["FastAPI", ["fastapi"]],
  ["Flask", ["flask"]],
  ["Spring", ["spring", "spring boot"]],
  ["Laravel", ["laravel"]],
  ["GraphQL", ["graphql"]],
  ["gRPC", ["grpc"]],
  ["REST", ["rest", "rest api", "restful"]],
  ["PostgreSQL", ["postgresql", "postgres"]],
  ["MySQL", ["mysql", "mariadb"]],
  ["MongoDB", ["mongodb", "mongo"]],
  ["Redis", ["redis"]],
  ["ClickHouse", ["clickhouse"]],
  ["Elasticsearch", ["elasticsearch", "elastic", "opensearch"]],
  ["Kafka", ["kafka"]],
  ["RabbitMQ", ["rabbitmq"]],
  ["NATS", ["nats"]],
  ["SQL", ["sql"]],
  ["Docker", ["docker"]],
  ["Kubernetes", ["kubernetes", "k8s"]],
  ["Terraform", ["terraform"]],
  ["Ansible", ["ansible"]],
  ["Helm", ["helm"]],
  ["AWS", ["aws", "amazon web services"]],
  ["GCP", ["gcp", "google cloud"]],
  ["Azure", ["azure"]],
  ["Linux", ["linux"]],
  ["CI/CD", ["ci/cd", "cicd", "gitlab ci", "github actions", "jenkins"]],
  ["Prometheus", ["prometheus", "grafana"]],
  ["Airflow", ["airflow"]],
  ["Spark", ["spark", "pyspark"]],
  ["dbt", ["dbt"]],
  ["Snowflake", ["snowflake"]],
  ["Databricks", ["databricks"]],
  ["Pandas", ["pandas"]],
  ["PyTorch", ["pytorch"]],
  ["TensorFlow", ["tensorflow"]],
  ["LLM", ["llm", "llms", "openai", "langchain", "rag"]],
  ["Tableau", ["tableau", "power bi", "powerbi"]],
  ["Selenium", ["selenium"]],
  ["Playwright", ["playwright"]],
  ["Cypress", ["cypress"]],
  ["Unity", ["unity"]],
  ["Unreal", ["unreal", "unreal engine"]],
  ["Solidity", ["solidity", "web3"]],
  ["iOS", ["ios"]],
  ["Android", ["android"]],
  ["Tailwind", ["tailwind", "tailwindcss"]],
  ["HTML/CSS", ["html", "css", "html/css", "sass", "scss"]],
  ["Git", ["git"]],
  ["Salesforce", ["salesforce", "apex"]],
  ["SAP", ["sap", "abap"]],
  ["Figma", ["figma"]],
];

const SHORT = new Set(["go", "c", "ts", "js", "r", "next", "rest", "spring", "swift", "dart", "express", "elastic", "rails", "sap", "apex", "git", "helm", "spark", "rag"]);

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Стек: сначала из тегов и названия, затем добираем из описания. Не больше max. */
export function extractSkills(title: string, tags: string[], descriptionText: string, max = 8): string[] {
  const found: string[] = [];
  const push = (name: string) => {
    if (!found.includes(name)) found.push(name);
  };
  const tagSet = new Set(tags.map((t) => t.toLowerCase().trim()));
  const titleLower = title.toLowerCase();

  for (const [name, aliases] of TECH) {
    for (const alias of aliases) {
      if (tagSet.has(alias)) {
        push(name);
        break;
      }
      const re = new RegExp(`(^|[^a-z0-9+#.])${escapeRe(alias)}($|[^a-z0-9+#])`, "i");
      if (re.test(titleLower)) {
        push(name);
        break;
      }
    }
  }
  if (found.length < max) {
    const text = descriptionText.slice(0, 20_000);
    for (const [name, aliases] of TECH) {
      if (found.includes(name)) continue;
      for (const alias of aliases) {
        if (SHORT.has(alias)) continue;
        const re = new RegExp(`(^|[^a-z0-9+#.])${escapeRe(alias)}($|[^a-z0-9+#])`, "i");
        if (re.test(text)) {
          push(name);
          break;
        }
      }
      if (found.length >= max) break;
    }
  }
  return found.slice(0, max);
}

/* ───────────────────────────── Язык ─────────────────────────────
 * Грубая оценка по служебным словам: достаточно, чтобы отличить
 * английский от немецкого, испанского, французского, португальского и русского.
 */

const STOP: Record<string, string[]> = {
  en: ["the", "and", "with", "for", "you", "our", "will", "are", "experience", "team"],
  de: ["und", "der", "die", "das", "mit", "für", "wir", "sie", "nicht", "eine"],
  es: ["de", "la", "los", "con", "para", "una", "que", "nuestro", "equipo", "experiencia"],
  fr: ["les", "des", "une", "pour", "avec", "nous", "vous", "équipe", "dans", "sur"],
  pt: ["de", "com", "para", "uma", "que", "nossa", "equipe", "você", "não", "mais"],
  ru: ["и", "в", "на", "с", "мы", "вы", "для", "опыт", "команда", "работа"],
};

export function detectLanguage(text: string): string {
  const words = text
    .toLowerCase()
    .replace(/[^\p{L}\s]/gu, " ")
    .split(/\s+/)
    .slice(0, 600);
  if (words.length < 20) return "en";
  const counts = new Map<string, number>();
  for (const w of words) counts.set(w, (counts.get(w) ?? 0) + 1);
  let best = "en";
  let bestScore = -1;
  for (const [lang, stop] of Object.entries(STOP)) {
    const score = stop.reduce((s, w) => s + (counts.get(w) ?? 0), 0);
    if (score > bestScore) {
      bestScore = score;
      best = lang;
    }
  }
  return best;
}

/* ───────────────────────────── Зарплата из текста ─────────────────────────────
 * «$120k - $160k», «€60,000 – €80,000», «80000-120000 USD», «$50/hr».
 */

const CUR_SIGN: Record<string, string> = { $: "USD", "€": "EUR", "£": "GBP", "₽": "RUB", "₹": "INR", "C$": "CAD", "A$": "AUD" };

export function parseSalaryText(text: string | null | undefined): {
  min: number | null;
  max: number | null;
  currency: string | null;
  period: SalaryPeriod;
} | null {
  if (!text) return null;
  const s = text.replace(/\s+/g, " ").trim();
  if (!s) return null;
  const nums = [...s.matchAll(/(\d[\d,.]*)\s*(k)?/gi)]
    .map((m) => {
      const n = Number(m[1].replace(/,/g, ""));
      return m[2] ? n * 1000 : n;
    })
    .filter((n) => Number.isFinite(n) && n > 0);
  if (!nums.length) return null;
  let currency: string | null = null;
  const code = s.match(/\b(USD|EUR|GBP|RUB|CAD|AUD|INR|CHF|PLN)\b/i);
  if (code) currency = code[1].toUpperCase();
  else {
    for (const [sign, cur] of Object.entries(CUR_SIGN)) {
      if (s.includes(sign)) {
        currency = cur;
        break;
      }
    }
  }
  let period: SalaryPeriod = "YEAR";
  if (/(\/\s*h|hour|hr\b)/i.test(s)) period = "HOUR";
  else if (/(\/\s*m|month|mo\b)/i.test(s)) period = "MONTH";
  else if (Math.max(...nums) < 1000) period = "HOUR";
  else if (Math.max(...nums) < 15000) period = "MONTH";
  const sorted = nums.slice(0, 2).sort((a, b) => a - b);
  return { min: sorted[0] ?? null, max: sorted[1] ?? sorted[0] ?? null, currency, period };
}

/** Период источника → наш enum */
export function normalizePeriod(p: string | null | undefined): SalaryPeriod | null {
  if (!p) return null;
  const v = p.toLowerCase();
  if (/(year|annual|yr)/.test(v)) return "YEAR";
  if (/(month|mo)/.test(v)) return "MONTH";
  if (/(hour|hr)/.test(v)) return "HOUR";
  return null;
}

/** Убрать HTML-теги и схлопнуть пробелы: для поиска стека и определения языка */
export function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/** Нормализованное имя компании для склейки: «GitLab Inc.» → «gitlab» */
export function companyKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/[™®©]/g, "")
    .replace(/\b(inc|llc|ltd|limited|gmbh|ag|sa|s\.a\.|srl|bv|b\.v\.|plc|corp|corporation|co|company|oy|ab|as|aps|kk|pty|pvt|ооо|ао|зао|пао|ип)\b\.?/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "")
    .slice(0, 80);
}

/** «Canada; Remote, United States ()» → «Canada, United States» */
export function cleanLocation(s: string | null | undefined): string | null {
  if (!s) return null;
  const v = s
    .replace(/\bremote( job| work)?\b/gi, "")
    .replace(/\(\s*\)/g, "")
    .replace(/[;|/]/g, ",")
    .split(",")
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .filter((p, i, arr) => arr.indexOf(p) === i)
    .join(", ");
  return v || null;
}

/** Инициалы для аватара без логотипа: «Quant Bank» → «QB» */
export function initialsOf(name: string): string {
  const parts = name
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}
