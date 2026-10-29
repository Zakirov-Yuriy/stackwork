import "server-only";
import sanitizeHtml from "sanitize-html";

/**
 * Описание вакансии из источника показываем как есть, но без скриптов,
 * стилей, форм и трекинг-пикселей. Ссылки открываются в новой вкладке.
 */
const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "p", "br", "b", "strong", "i", "em", "u", "s", "ul", "ol", "li", "h1", "h2", "h3", "h4", "h5", "h6",
    "blockquote", "code", "pre", "a", "hr", "table", "thead", "tbody", "tr", "th", "td", "span", "div",
  ],
  allowedAttributes: { a: ["href", "target", "rel"], td: ["colspan"], th: ["colspan"] },
  allowedSchemes: ["http", "https", "mailto"],
  // h1 в описании ломает иерархию страницы
  transformTags: {
    h1: "h2",
    a: (tagName, attribs) => ({
      tagName,
      attribs: { ...attribs, target: "_blank", rel: "nofollow noopener noreferrer" },
    }),
  },
  exclusiveFilter: (frame) => {
    // Пустые абзацы и div-обёртки без текста
    return (frame.tag === "p" || frame.tag === "div" || frame.tag === "span") && !frame.text.trim() && !frame.mediaChildren.length;
  },
};

export function sanitizeDescription(html: string): string {
  const decoded = decodeEntities(html);
  return sanitizeHtml(decoded, OPTIONS).replace(/(\s*<br\s*\/?>\s*){3,}/gi, "<br><br>").trim();
}

/** Greenhouse отдаёт HTML, закодированный сущностями: &lt;p&gt;… */
function decodeEntities(s: string): string {
  if (!/&lt;[a-z]/i.test(s)) return s;
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}
