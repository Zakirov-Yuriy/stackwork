import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export async function MeTabs({ active }: { active: "applications" | "saved" }) {
  const t = await getTranslations("me");
  const tab = (key: typeof active, href: string, label: string) => (
    <Link href={href} className="neu-tab inline-flex items-center justify-center px-5" aria-current={active === key ? "page" : undefined} style={{ minHeight: 42, fontSize: 14, borderRadius: 10 }}>
      {label}
    </Link>
  );
  return (
    <nav aria-label={t("tabs.label")} className="neu-tabs inline-grid grid-cols-2 gap-1 self-start" style={{ padding: 4, borderRadius: 14 }}>
      {tab("applications", "/me", t("tabs.applications"))}
      {tab("saved", "/me/saved", t("saved.title"))}
    </nav>
  );
}
