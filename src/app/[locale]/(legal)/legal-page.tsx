import { getLocale, getTranslations } from "next-intl/server";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export type LegalSection = { title: string; paragraphs: string[] };

/** Контакт и оператор для юридических страниц и подвала: CONTACT_EMAIL и необязательный LEGAL_OPERATOR */
export function legalContacts() {
  return {
    email: process.env.CONTACT_EMAIL?.trim() || null,
    operator: process.env.LEGAL_OPERATOR?.trim() || null,
  };
}

/**
 * Юридическая страница. Документы только на русском (152-ФЗ): для других языков над текстом плашка.
 * sections: готовый текст (заголовок и абзацы). Внизу контактная почта из CONTACT_EMAIL и, если задано,
 * наименование оператора из LEGAL_OPERATOR (сервис бесплатный, юридическое лицо не обязательно,
 * но Google Play и 152-ФЗ ждут, что в политике назван тот, кто отвечает за данные).
 */
export async function LegalPage({ title, intro, sections, updated }: { title: string; intro: string; sections: LegalSection[]; updated?: string }) {
  const [locale, t] = await Promise.all([getLocale(), getTranslations("legal")]);
  const { email, operator } = legalContacts();
  return (
    <>
      <SiteHeader />
      <main className="mx-auto box-border flex w-full max-w-[1180px] flex-1 flex-col gap-6 px-6 pb-14 pt-8">
        <div className="flex max-w-[760px] flex-col gap-2">
          <h1 className="m-0 text-[32px] font-extrabold leading-tight tracking-tight">{title}</h1>
          <p className="m-0 text-[15px] leading-relaxed text-[color:var(--soft-muted)]">{intro}</p>
          {updated ? <p className="m-0 text-sm text-[color:var(--soft-muted)]">Редакция от {updated}</p> : null}
        </div>
        <article className="neu-card flex max-w-[860px] flex-col gap-5 p-8 text-[15px] leading-relaxed" lang="ru">
          {locale !== "ru" ? (
            <p className="m-0 rounded-xl bg-[#FFF0C2] px-4 py-3 text-sm font-semibold text-[#7A5200]" lang={locale}>
              {t("notice")}
            </p>
          ) : null}
          {sections.map((s, i) => (
            <section key={s.title} className="flex flex-col gap-2">
              <h2 className="m-0 text-lg font-extrabold">
                {i + 1}. {s.title}
              </h2>
              {s.paragraphs.map((p) => (
                <p key={p.slice(0, 40)} className="m-0">
                  {p}
                </p>
              ))}
            </section>
          ))}
          {email || operator ? (
            <p className="m-0 border-t border-[color:var(--soft-dark)] pt-4 text-sm text-[color:var(--soft-muted)]">
              {operator ? `Оператор: ${operator}. ` : null}
              {email ? (
                <>
                  Контакт:{" "}
                  <a href={`mailto:${email}`} className="font-semibold text-[color:var(--soft-blue)]">
                    {email}
                  </a>
                </>
              ) : null}
            </p>
          ) : null}
        </article>
      </main>
      <SiteFooter compact />
    </>
  );
}
