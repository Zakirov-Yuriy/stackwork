const MAP: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i", й: "y",
  к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f",
  х: "h", ц: "ts", ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
};

/** Транслитерация + нормализация в URL-slug: «Квант Банк» → kvant-bank */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .split("")
    .map((ch) => MAP[ch] ?? ch)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Подбирает свободный slug: base, base-2, base-3… */
export async function uniqueSlug(base: string, exists: (slug: string) => Promise<boolean>): Promise<string> {
  let candidate = base;
  for (let i = 2; await exists(candidate); i++) {
    candidate = `${base}-${i}`;
    if (i > 50) {
      candidate = `${base}-${Date.now().toString(36)}`;
      break;
    }
  }
  return candidate;
}

/** Slug технологии: «C#» → csharp, «C++» → cplusplus, «.NET» → dotnet, «Node.js» → node-js */
export function skillSlug(name: string): string {
  const prepared = name.trim().replace(/#/g, "sharp").replace(/\+/g, "plus").replace(/^\./, "dot");
  return slugify(prepared) || `skill-${Buffer.from(name).toString("hex").slice(0, 12)}`;
}
