/**
 * География для разметки JobPosting. Google требует для удалённой вакансии хотя бы одну страну
 * в applicantLocationRequirements, а для офисной addressCountry в jobLocation. Источники пишут
 * что угодно: «US», «United States -», «San Francisco, CA», «Remote Germany», «EMEA», «Россия».
 */

const US_STATES = new Set("AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY DC".split(" "));

const ALIASES: Record<string, string> = {
  us: "USA", usa: "USA", "u.s.": "USA", "u.s.a.": "USA", "united states": "USA", "united states of america": "USA", america: "USA", states: "USA", "us only": "USA", "usa only": "USA",
  uk: "United Kingdom", "u.k.": "United Kingdom", gb: "United Kingdom", "great britain": "United Kingdom", britain: "United Kingdom", england: "United Kingdom", scotland: "United Kingdom",
  россия: "Russia", рф: "Russia", russia: "Russia", "russian federation": "Russia",
  deutschland: "Germany", germany: "Germany", "the netherlands": "Netherlands", holland: "Netherlands",
  uae: "United Arab Emirates", "south korea": "South Korea", korea: "South Korea", czechia: "Czechia", "czech republic": "Czechia",
  беларусь: "Belarus", казахстан: "Kazakhstan", украина: "Ukraine", армения: "Armenia", грузия: "Georgia", узбекистан: "Uzbekistan", кыргызстан: "Kyrgyzstan", сербия: "Serbia", турция: "Turkey", кипр: "Cyprus",
};

const US_STATE_NAMES = new Set(["california", "new york state", "texas", "washington state", "florida", "illinois", "massachusetts", "colorado", "georgia", "virginia", "oregon", "arizona", "pennsylvania", "north carolina", "new jersey", "utah", "ohio", "michigan", "minnesota", "maryland", "nevada", "tennessee", "sf bay area", "bay area", "sf", "silicon valley"]);

const CITY_COUNTRY: Record<string, string> = {
  "san francisco": "USA", "new york": "USA", nyc: "USA", "new york city": "USA", seattle: "USA", austin: "USA", boston: "USA", chicago: "USA", "los angeles": "USA", denver: "USA", "menlo park": "USA",
  "san mateo": "USA", "foster city": "USA", "palo alto": "USA", "mountain view": "USA", sunnyvale: "USA", "redwood city": "USA", oakland: "USA", bellevue: "USA", washington: "USA", "washington, dc": "USA",
  atlanta: "USA", miami: "USA", dallas: "USA", houston: "USA", portland: "USA", "san diego": "USA", "san jose": "USA", philadelphia: "USA", phoenix: "USA", minneapolis: "USA", pittsburgh: "USA", "salt lake city": "USA",
  london: "United Kingdom", manchester: "United Kingdom", edinburgh: "United Kingdom", cambridge: "United Kingdom", bristol: "United Kingdom",
  toronto: "Canada", vancouver: "Canada", montreal: "Canada", ottawa: "Canada", calgary: "Canada", waterloo: "Canada",
  berlin: "Germany", munich: "Germany", münchen: "Germany", hamburg: "Germany", frankfurt: "Germany", cologne: "Germany", köln: "Germany", stuttgart: "Germany", würzburg: "Germany", homeoffice: "Germany",
  paris: "France", amsterdam: "Netherlands", rotterdam: "Netherlands", dublin: "Ireland", lisbon: "Portugal", lisboa: "Portugal", porto: "Portugal", madrid: "Spain", barcelona: "Spain",
  zurich: "Switzerland", zürich: "Switzerland", stockholm: "Sweden", copenhagen: "Denmark", oslo: "Norway", helsinki: "Finland", warsaw: "Poland", warszawa: "Poland", krakow: "Poland", kraków: "Poland", wroclaw: "Poland",
  prague: "Czech Republic", vienna: "Austria", wien: "Austria", brussels: "Belgium", milan: "Italy", rome: "Italy", athens: "Greece", bucharest: "Romania", budapest: "Hungary", belgrade: "Serbia", kyiv: "Ukraine",
  tokyo: "Japan", singapore: "Singapore", sydney: "Australia", melbourne: "Australia", auckland: "New Zealand", "tel aviv": "Israel", dubai: "United Arab Emirates",
  bangalore: "India", bengaluru: "India", mumbai: "India", hyderabad: "India", pune: "India", chennai: "India", delhi: "India", "new delhi": "India", gurgaon: "India", noida: "India",
  "são paulo": "Brazil", "sao paulo": "Brazil", "mexico city": "Mexico", "buenos aires": "Argentina", bogota: "Colombia", bogotá: "Colombia", santiago: "Chile",
  moscow: "Russia", "saint petersburg": "Russia", "st. petersburg": "Russia", "st petersburg": "Russia", minsk: "Belarus", almaty: "Kazakhstan", astana: "Kazakhstan", tashkent: "Uzbekistan", tbilisi: "Georgia", yerevan: "Armenia", limassol: "Cyprus", nicosia: "Cyprus", larnaca: "Cyprus", istanbul: "Turkey",
  москва: "Russia", "санкт-петербург": "Russia", новосибирск: "Russia", екатеринбург: "Russia", казань: "Russia", "нижний новгород": "Russia", краснодар: "Russia", самара: "Russia", минск: "Belarus", алматы: "Kazakhstan", астана: "Kazakhstan", ташкент: "Uzbekistan", тбилиси: "Georgia", ереван: "Armenia",
};

// Регионы, которые Google страной не считает: раскрываем в несколько стран
const REGIONS: Record<string, string[]> = {
  europe: ["Germany", "United Kingdom", "Netherlands", "Spain", "Poland", "Portugal"],
  eu: ["Germany", "Netherlands", "Spain", "Poland", "Portugal", "France"],
  emea: ["Germany", "United Kingdom", "Netherlands", "Spain", "Poland", "United Arab Emirates"],
  "north america": ["USA", "Canada"], "us & canada": ["USA", "Canada"], "us and canada": ["USA", "Canada"], "us/canada": ["USA", "Canada"],
  latam: ["Brazil", "Mexico", "Argentina", "Colombia"], "latin america": ["Brazil", "Mexico", "Argentina", "Colombia"],
  apac: ["Singapore", "Australia", "India", "Japan"], asia: ["Singapore", "India", "Japan"],
  americas: ["USA", "Canada", "Brazil", "Mexico"], amer: ["USA", "Canada", "Brazil", "Mexico"],
  cis: ["Russia", "Kazakhstan", "Belarus", "Armenia"], снг: ["Russia", "Kazakhstan", "Belarus", "Armenia"],
  dach: ["Germany", "Austria", "Switzerland"], benelux: ["Netherlands", "Belgium"], nordics: ["Sweden", "Denmark", "Norway", "Finland"],
};

// Устаревшие и служебные коды регионов ICU: у них те же названия, что у настоящих стран
const LEGACY_CODES = new Set(["DD", "SU", "YU", "ZR", "BU", "CS", "TP", "FX", "AN", "NT", "YD", "QU", "EU", "UN", "XA", "XB", "ZZ", "QO", "EZ"]);

const WORLD = /^(worldwide|world|global|globally|anywhere|international|remote|everywhere|any|all|весь мир|любая страна)$/;

let namesByCode: Map<string, string> | null = null;
let knownNames: Set<string> | null = null;
const codeByName = new Map<string, string>();
function countryTables() {
  if (namesByCode && knownNames) return { namesByCode, knownNames };
  namesByCode = new Map();
  knownNames = new Set();
  const dn = new Intl.DisplayNames(["en"], { type: "region" });
  for (let a = 65; a <= 90; a++) {
    for (let b = 65; b <= 90; b++) {
      const code = String.fromCharCode(a, b);
      if (LEGACY_CODES.has(code)) continue;
      let name: string | undefined;
      try {
        name = dn.of(code);
      } catch {
        continue;
      }
      if (!name || name === code) continue;
      const ours = name === "United States" ? "USA" : name;
      namesByCode.set(code, ours);
      if (!codeByName.has(ours.toLowerCase())) codeByName.set(ours.toLowerCase(), code); // RU раньше SU, US раньше UM
      knownNames.add(name.toLowerCase());
    }
  }
  return { namesByCode, knownNames };
}

function cleanToken(t: string): string {
  return t.replace(/[()\[\]:;|]/g, " ").replace(/\b(remote|only|based|office|timezones?|time zones?|hiring in|located in|from|in)\b/gi, " ").replace(/\s+/g, " ").replace(/^[\s\-–—]+|[\s\-–—]+$/g, "").trim();
}

/** Одна часть строки локации → страна (или null) */
function countryOfToken(raw: string): string | null {
  const t = cleanToken(raw);
  if (!t) return null;
  const low = t.toLowerCase();
  if (ALIASES[low]) return ALIASES[low];
  if (US_STATE_NAMES.has(low)) return "USA";
  const { namesByCode, knownNames } = countryTables();
  if (/^[A-Z]{2}$/.test(t) && !US_STATES.has(t) && namesByCode.has(t)) return namesByCode.get(t)!;
  if (US_STATES.has(t.toUpperCase()) && t.length === 2) return "USA";
  if (knownNames.has(low)) return t.replace(/\b\w/g, (c) => c.toUpperCase());
  if (CITY_COUNTRY[low]) return CITY_COUNTRY[low];
  // «US-CA-Menlo Park», «San Francisco Office (Fremont St)», «United States -»: ищем страну или город внутри
  for (const part of low.split(/[-/]/).map((p) => p.trim()).filter(Boolean)) {
    if (ALIASES[part]) return ALIASES[part];
    if (CITY_COUNTRY[part]) return CITY_COUNTRY[part];
    if (knownNames.has(part)) return part.replace(/\b\w/g, (c) => c.toUpperCase());
  }
  for (const [city, country] of Object.entries(CITY_COUNTRY)) if (low.startsWith(city)) return country;
  return null;
}

/**
 * Страны, где может находиться сотрудник, из пометки к удалённой вакансии.
 * Пустой список означает «не разобрали»: вызывающий код подставляет Worldwide.
 */
export function countriesFor(note: string | null | undefined): string[] {
  if (!note) return [];
  const exact: string[] = []; // названные страны
  const fromRegions: string[] = []; // раскрытые регионы, добавляем после названных
  const push = (list: string[], c: string) => {
    if (!exact.includes(c) && !list.includes(c)) list.push(c);
  };
  for (const token of note.split(/,|\/|&|\band\b|\bor\b|\+|;|\|/i)) {
    const l = cleanToken(token).toLowerCase();
    if (!l) continue;
    if (WORLD.test(l)) push(exact, "Worldwide");
    else if (REGIONS[l]) REGIONS[l].forEach((c) => push(fromRegions, c));
    else {
      const c = countryOfToken(token);
      if (c) push(exact, c);
      else {
        // «Remote Europe (CET ±2)», «EMEA timezones»: регион внутри фразы
        const region = Object.keys(REGIONS).find((r) => l.startsWith(`${r} `) || l.endsWith(` ${r}`));
        if (region) REGIONS[region].forEach((c) => push(fromRegions, c));
      }
    }
  }
  const out = [...exact, ...fromRegions.filter((c) => !exact.includes(c))];
  // Worldwide вместе с конкретными странами смысла не имеет
  if (out.length > 1 && out.includes("Worldwide")) return ["Worldwide"];
  return out.slice(0, 8);
}

/** Код ISO 3166-1 для jobLocation.addressCountry по названию города или страны (null, если не знаем) */
export function countryCodeOf(cityOrCountry: string | null | undefined): string | null {
  if (!cityOrCountry) return null;
  const name = countryOfToken(cityOrCountry);
  if (!name) return null;
  countryTables();
  return codeByName.get(name.toLowerCase()) ?? (name === "USA" ? "US" : null);
}
