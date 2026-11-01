/** Структурированные данные schema.org в <script type="application/ld+json">. */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  // «<» экранируем, чтобы содержимое описания не могло закрыть тег script
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
