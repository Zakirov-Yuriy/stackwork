import Link from "next/link";

export function MeTabs({ active }: { active: "applications" | "saved" }) {
  const tab = (key: typeof active, href: string, label: string) => (
    <Link href={href} className="neu-tab inline-flex items-center justify-center px-5" aria-current={active === key ? "page" : undefined} style={{ minHeight: 42, fontSize: 14, borderRadius: 10 }}>
      {label}
    </Link>
  );
  return (
    <nav aria-label="Разделы кабинета" className="neu-tabs inline-grid grid-cols-2 gap-1 self-start" style={{ padding: 4, borderRadius: 14 }}>
      {tab("applications", "/me", "Отклики")}
      {tab("saved", "/me/saved", "Избранное")}
    </nav>
  );
}
