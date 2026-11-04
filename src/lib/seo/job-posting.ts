import { siteUrl } from "@/lib/mail";
import { stripHtml } from "@/lib/import/classify";
import type { Employment, SalaryPeriod, Vacancy, Company } from "@/generated/prisma/client";

/**
 * Разметка schema.org JobPosting для страницы вакансии: так вакансии попадают
 * в блок «Вакансии» Google и в расширенные сниппеты Яндекса.
 * https://developers.google.com/search/docs/appearance/structured-data/job-posting
 */

const EMPLOYMENT: Record<Employment, string> = { FULL_TIME: "FULL_TIME", PART_TIME: "PART_TIME", CONTRACT: "CONTRACTOR" };
const UNIT: Record<SalaryPeriod, string> = { MONTH: "MONTH", YEAR: "YEAR", HOUR: "HOUR" };

type V = Pick<
  Vacancy,
  | "id" | "slug" | "title" | "source" | "publishedAt" | "expiresAt" | "updatedAt" | "employment" | "workFormat" | "city" | "locationNote"
  | "salaryFrom" | "salaryTo" | "currency" | "salaryPeriod" | "descriptionHtml" | "aboutTeam" | "responsibilities" | "requirements" | "niceToHave" | "conditions"
> & { company: Pick<Company, "name" | "website" | "logoUrl" | "slug"> };

function sectionsHtml(v: V): string {
  const block = (title: string, text: string | null, list: boolean) => {
    if (!text) return "";
    const items = text.split("\n").map((s) => s.trim()).filter(Boolean);
    if (!items.length) return "";
    return list ? `<h3>${title}</h3><ul>${items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>` : `<h3>${title}</h3><p>${items.map(esc).join("<br>")}</p>`;
  };
  return [
    block("О команде", v.aboutTeam, false),
    block("Чем предстоит заниматься", v.responsibilities, true),
    block("Что важно", v.requirements, true),
    block("Будет плюсом", v.niceToHave, true),
    block("Условия", v.conditions, true),
  ].join("");
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function jobPostingJsonLd(v: V): Record<string, unknown> {
  const posted = v.publishedAt ?? v.updatedAt;
  const validThrough = v.expiresAt ?? new Date(posted.getTime() + 60 * 86_400_000);
  const description = v.source === "MANUAL" ? sectionsHtml(v) : v.descriptionHtml ?? "";
  const remote = v.workFormat === "REMOTE" || v.workFormat === "REMOTE_OR_OFFICE";

  const data: Record<string, unknown> = {
    "@context": "https://schema.org/",
    "@type": "JobPosting",
    title: v.title,
    description: description || stripHtml(v.title),
    datePosted: posted.toISOString(),
    validThrough: validThrough.toISOString(),
    employmentType: EMPLOYMENT[v.employment],
    identifier: { "@type": "PropertyValue", name: v.company.name, value: v.id },
    hiringOrganization: {
      "@type": "Organization",
      name: v.company.name,
      ...(v.company.website && /^https?:\/\//.test(v.company.website) ? { sameAs: v.company.website } : {}),
      ...(v.company.logoUrl ? { logo: v.company.logoUrl } : {}),
    },
    url: siteUrl(`/vacancies/${v.slug}`),
    directApply: v.source === "MANUAL",
  };

  if (v.city) {
    data.jobLocation = {
      "@type": "Place",
      address: { "@type": "PostalAddress", addressLocality: v.city, addressCountry: v.source === "MANUAL" ? "RU" : undefined },
    };
  }
  if (remote) {
    data.jobLocationType = "TELECOMMUTE";
    const countries = (v.locationNote ?? (v.source === "MANUAL" ? "Россия" : ""))
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 6);
    if (countries.length) data.applicantLocationRequirements = countries.map((name) => ({ "@type": "Country", name }));
  }
  if (v.salaryFrom || v.salaryTo) {
    data.baseSalary = {
      "@type": "MonetaryAmount",
      currency: v.currency,
      value: {
        "@type": "QuantitativeValue",
        ...(v.salaryFrom ? { minValue: v.salaryFrom } : {}),
        ...(v.salaryTo ? { maxValue: v.salaryTo } : {}),
        unitText: UNIT[v.salaryPeriod],
      },
    };
  }
  return data;
}

/** Домен без протокола: Google «сильно учитывает» его как запасное имя сайта, если основное не подошло */
function siteHost(): string {
  return siteUrl("/").replace(/^https?:\/\//, "").replace(/\/$/, "").toLowerCase();
}

/**
 * Имя сайта для выдачи Google (developers.google.com/search/docs/appearance/site-names):
 * берётся из WebSite на главной, alternateName — запасные варианты по убыванию предпочтения.
 */
export function websiteJsonLd(locale: "ru" | "en" = "ru"): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": siteUrl("/#website"),
    name: "Stackwork",
    alternateName: ["Stackwork Jobs", "stackworkjobs", siteHost()],
    url: siteUrl("/"),
    inLanguage: locale === "ru" ? "ru-RU" : "en-US",
    publisher: { "@id": siteUrl("/#organization") },
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: siteUrl(locale === "ru" ? "/?q={search_term_string}" : "/en?q={search_term_string}") },
      "query-input": "required name=search_term_string",
    },
  };
}

/** Издатель сайта: имя и логотип для сниппетов и панели знаний */
export function organizationJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": siteUrl("/#organization"),
    name: "Stackwork",
    alternateName: ["Stackwork Jobs", "stackworkjobs"],
    url: siteUrl("/"),
    logo: { "@type": "ImageObject", url: siteUrl("/icons/icon-512.png"), width: 512, height: 512 },
    sameAs: ["https://t.me/stackworkjobs"],
  };
}
