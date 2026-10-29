"use client";

import type { VacancySource } from "@/generated/prisma/client";
import { SOURCE_LABEL, isEmployerBoard } from "@/lib/labels";

/**
 * Кнопка отклика для импортированных вакансий: ведёт на страницу источника
 * в новой вкладке. Переход считаем в статистике (kind = APPLY).
 */
export function ExternalApply({ href, slug, source, large = false }: { href: string; slug: string; source: VacancySource; large?: boolean }) {
  const track = () => {
    try {
      const payload = JSON.stringify({ path: `/apply/${slug}`, vacancy: slug, from: source.toLowerCase() });
      if (navigator.sendBeacon) navigator.sendBeacon("/api/track", new Blob([payload], { type: "application/json" }));
    } catch {}
  };
  return (
    <a href={href} target="_blank" rel="noopener" onClick={track} className="neu-primary-sm" style={large ? { minHeight: 48, padding: "0 24px", fontSize: 15 } : undefined}>
      {isEmployerBoard(source) ? "Откликнуться на сайте работодателя" : "Откликнуться"}
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M14 4h6v6" />
        <path d="M20 4l-9 9" />
        <path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5" />
      </svg>
    </a>
  );
}

/** Строка источника. Ссылка без nofollow: это условие площадок, которые отдают вакансии. */
export function SourceLine({ source, url, companyName }: { source: VacancySource; url: string | null; companyName: string }) {
  if (source === "MANUAL") return null;
  const label = SOURCE_LABEL[source];
  return (
    <p className="m-0 text-[13px] text-[color:var(--soft-muted)]">
      {isEmployerBoard(source) ? (
        <>
          Вакансия опубликована компанией {companyName} на{" "}
          <a href={url ?? "#"} target="_blank" rel="noopener" className="soft-link">
            своём сайте
          </a>
          .
        </>
      ) : (
        <>
          По данным{" "}
          <a href={url ?? "#"} target="_blank" rel="noopener" className="soft-link">
            {label}
          </a>
          . Описание приведено как в источнике.
        </>
      )}
    </p>
  );
}
