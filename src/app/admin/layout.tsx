import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/guards";
import { logoutAction } from "@/app/(auth)/actions";
import { AdminShell } from "@/components/admin/shell";
import { countRunningImports } from "@/lib/import/run";

// Public Sans из шаблона Sneat без кириллицы, берём Inter: такой же нейтральный гротеск
const inter = Inter({ variable: "--font-public-sans", subsets: ["latin", "cyrillic"], weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: { default: "Админка", template: "%s | Админка Stackwork" },
  robots: { index: false, follow: false },
};

// Тема ставится до отрисовки, чтобы не мигал светлый фон
const themeScript = `(function(){try{if(localStorage.getItem('admin-theme')==='dark'){document.documentElement.dataset.adminTheme='dark'}}catch(e){}})();`;

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const user = await requireRole("ADMIN", "/admin");
  const [moderation, claims, running] = await Promise.all([
    db.vacancy.count({ where: { status: "MODERATION" } }),
    db.companyClaim.count({ where: { status: "PENDING" } }),
    countRunningImports(),
  ]);

  return (
    <div className={inter.variable}>
      <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      <AdminShell user={{ name: user.name, email: user.email }} badges={{ moderation, claims, running: running > 0 }} logout={logoutAction}>
        {children}
      </AdminShell>
    </div>
  );
}
