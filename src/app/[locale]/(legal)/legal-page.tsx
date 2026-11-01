import { getLocale, getTranslations } from "next-intl/server";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

/**
 * Каркас юридической страницы. Текст документов будет подставлен позже:
 * сейчас на странице маркер [ТЕКСТ ДОКУМЕНТА], чтобы ссылки из футера не вели в 404.
 * Сами документы только на русском (152-ФЗ): для других языков над текстом плашка об этом.
 */
export async function LegalPage({ title, intro, sections }: { title: string; intro: string; sections: string[] }) {
  const [locale, t] = await Promise.all([getLocale(), getTranslations("legal")]);
  return (
    <>
      <SiteHeader />
      <main className="mx-auto box-border flex w-full max-w-[1180px] flex-1 flex-col gap-6 px-6 pb-14 pt-8">
        <div className="flex max-w-[760px] flex-col gap-2">
          <h1 className="m-0 text-[32px] font-extrabold leading-tight tracking-tight">{title}</h1>
          <p className="m-0 text-[15px] leading-relaxed text-[color:var(--soft-muted)]">{intro}</p>
        </div>
        <article className="neu-card flex max-w-[860px] flex-col gap-5 p-8 text-[15px] leading-relaxed" lang="ru">
          {locale !== "ru" ? (
            <p className="m-0 rounded-xl bg-[#FFF0C2] px-4 py-3 text-sm font-semibold text-[#7A5200]" lang={locale}>
              {t("notice")}
            </p>
          ) : null}
          <p className="m-0 rounded-xl bg-[#FFF0C2] px-4 py-3 text-sm font-semibold text-[#7A5200]">
            Документ в подготовке. Ниже структура, текст появится до запуска.
          </p>
          {sections.map((s, i) => (
            <section key={s} className="flex flex-col gap-1.5">
              <h2 className="m-0 text-lg font-extrabold">
                {i + 1}. {s}
              </h2>
              <p className="m-0 text-[color:var(--soft-muted)]">[ТЕКСТ ДОКУМЕНТА]</p>
            </section>
          ))}
          <p className="m-0 border-t border-[color:var(--soft-dark)] pt-4 text-sm text-[color:var(--soft-muted)]">Оператор: [РЕКВИЗИТЫ ОПЕРАТОРА]. Контакт: [ПОЧТА ПОДДЕРЖКИ].</p>
        </article>
      </main>
      <SiteFooter compact />
    </>
  );
}
