import { toggleSavedAction } from "@/app/saved-actions";
import { BookmarkIcon } from "./icons";

/** Кнопка «в избранное». Серверная форма: работает без JS, состояние берётся из базы. */
export function SaveButton({ vacancyId, saved, back, withLabel = false }: { vacancyId: string; saved: boolean; back: string; withLabel?: boolean }) {
  return (
    <form action={toggleSavedAction} className="contents">
      <input type="hidden" name="vacancyId" value={vacancyId} />
      <input type="hidden" name="back" value={back} />
      <button
        type="submit"
        aria-label={saved ? "Убрать из избранного" : "Сохранить вакансию"}
        aria-pressed={saved}
        title={saved ? "В избранном" : "В избранное"}
        className={`neu-btn-sm ${withLabel ? "" : "h-11 w-11 px-0"} ${saved ? "text-[color:var(--soft-blue)]" : ""}`}
        style={withLabel ? { minHeight: 48 } : undefined}
      >
        <BookmarkIcon className={saved ? "fill-current" : ""} />
        {withLabel ? (saved ? "В избранном" : "Сохранить") : null}
      </button>
    </form>
  );
}
