import { getLocale, getTranslations } from "next-intl/server";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export type LegalSection = { title: string; paragraphs: string[] };

/**
 * Юридическая страница. Документы только на русском (152-ФЗ): для других языков над текстом плашка.
 * sections: готовый текст (заголовок и абзацы) или, пока документ не написан, только заголовки,
 * тогда вместо текста показывается маркер [ТЕКСТ ДОКУМЕНТА], чтобы ссылки из футера не вели в 404.
 * Реквизиты оператора: LEGAL_OPERATOR («ИП Иванов И. И., ОГРНИП …») и CONTACT_EMAIL.
 */
export async function LegalPage({ title, intro, sections, updated }: { title: string; intro: string; sections: string[] | LegalSection[]; updated?: string }) {
  const [locale, t] = await Promise.all([getLocale(), getTranslations("legal")]);
  const draft = sections.length === 0 || typeof sections[0] === "string";
  const list: LegalSection[] = (sections as (string | LegalSection)[]).map((s) => (typeof s === "string" ? { title: s, paragraphs: [] } : s));
  const operator = process.env.LEGAL_OPERATOR?.trim() || "[РЕКВИЗИТЫ ОПЕРАТОРА]";
  const contact = process.env.CONTACT_EMAIL?.trim() || "[ПОЧТА ПОДДЕРЖКИ]";
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
          {draft ? (
            <p className="m-0 rounded-xl bg-[#FFF0C2] px-4 py-3 text-sm font-semibold text-[#7A5200]">
              Документ в подготовке. Ниже структура, текст появится до запуска.
            </p>
          ) : null}
          {list.map((s, i) => (
            <section key={s.title} className="flex flex-col gap-2">
              <h2 className="m-0 text-lg font-extrabold">
                {i + 1}. {s.title}
              </h2>
              {s.paragraphs.length === 0 ? (
                <p className="m-0 text-[color:var(--soft-muted)]">[ТЕКСТ ДОКУМЕНТА]</p>
              ) : (
                s.paragraphs.map((p) => (
                  <p key={p.slice(0, 40)} className="m-0">
                    {p}
                  </p>
                ))
              )}
            </section>
          ))}
          <p className="m-0 border-t border-[color:var(--soft-dark)] pt-4 text-sm text-[color:var(--soft-muted)]">
            Оператор: {operator}. Контакт: {contact}.
          </p>
        </article>
      </main>
      <SiteFooter compact />
    </>
  );
}
