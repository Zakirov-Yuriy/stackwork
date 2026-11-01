import { useTranslations } from "next-intl";
import { toggleSavedAction } from "@/app/[locale]/saved-actions";
import { BookmarkIcon } from "./icons";

/** Кнопка «в избранное». Серверная форма: работает без JS, состояние берётся из базы. */
export function SaveButton({ vacancyId, saved, back, withLabel = false }: { vacancyId: string; saved: boolean; back: string; withLabel?: boolean }) {
  const t = useTranslations("home.card");
  const tc = useTranslations("common");
  return (
    <form action={toggleSavedAction} className="contents">
      <input type="hidden" name="vacancyId" value={vacancyId} />
      <input type="hidden" name="back" value={back} />
      <button
        type="submit"
        aria-label={saved ? t("unsave") : t("save")}
        aria-pressed={saved}
        title={saved ? t("saved") : t("toSaved")}
        className={`neu-btn-sm ${withLabel ? "" : "h-11 w-11 px-0"} ${saved ? "text-[color:var(--soft-blue)]" : ""}`}
        style={withLabel ? { minHeight: 48 } : undefined}
      >
        <BookmarkIcon className={saved ? "fill-current" : ""} />
        {withLabel ? (saved ? t("saved") : tc("actions.save")) : null}
      </button>
    </form>
  );
}
