import type { Employment, SalaryPeriod, VacancySource } from "@/generated/prisma/client";

/** Вакансия в том виде, в каком её отдаёт адаптер источника, до нормализации. */
export type RawJob = {
  source: VacancySource;
  externalId: string;
  /** Страница вакансии в источнике: сюда ведёт ссылка «По данным …» */
  externalUrl: string;
  /** Куда ведёт кнопка «Откликнуться» */
  applyUrl: string;
  title: string;
  companyName: string;
  companyLogo?: string | null;
  companyWebsite?: string | null;
  /** Описание как есть (HTML или текст), будет очищено */
  descriptionHtml: string;
  /** Теги, категории, отделы: подсказки для стека и направления */
  tags: string[];
  publishedAt: Date;
  expiresAt?: Date | null;
  salary?: {
    min?: number | null;
    max?: number | null;
    currency?: string | null;
    period?: SalaryPeriod | null;
    /** Текст вилки, если источник отдаёт строкой: «$120k - $160k» */
    text?: string | null;
  } | null;
  remote: boolean;
  /** Город или страна офиса, если есть */
  location?: string | null;
  /** Ограничение по стране кандидата: «Europe, USA» */
  locationNote?: string | null;
  employment?: Employment | null;
  /** Подсказка уровня от источника: «Senior», «Any», «Entry Level» */
  seniorityHint?: string | null;
  /** Язык, если источник его знает (ISO 639-1) */
  language?: string | null;
};

export type SourceFetchOptions = {
  /** Не брать больше, чем столько вакансий за запуск */
  limit: number;
  /** Пропускать вакансии старше этого числа дней */
  maxAgeDays: number;
  /** Доски ATS: токены компаний (Greenhouse, Lever, Ashby) */
  boards?: string[];
  /** Короткие заметки о ходе выборки для журнала */
  log: (line: string) => void;
};

export type SourceAdapter = {
  source: VacancySource;
  /** Как называем источник на сайте: «Remotive» */
  label: string;
  homepage: string;
  /** Через сколько дней без появления в выдаче вакансия уходит в архив */
  staleDays: number;
  /** true для досок ATS: вакансии с сайта работодателя, нужен список компаний */
  needsBoards?: boolean;
  /** Текст условия источника, показываем в админке */
  terms: string;
  fetch: (opts: SourceFetchOptions) => Promise<RawJob[]>;
};
