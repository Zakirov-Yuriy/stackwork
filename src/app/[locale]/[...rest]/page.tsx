import { notFound } from "next/navigation";

/** Любой неизвестный адрес внутри языка показывает локализованную страницу 404 */
export default function CatchAll() {
  notFound();
}
