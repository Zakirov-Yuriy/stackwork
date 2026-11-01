import { getTranslations } from "next-intl/server";
import { resendVerificationAction } from "@/app/[locale]/(auth)/actions";
import type { CurrentUser } from "@/lib/session";

/**
 * Плашка «подтвердите почту» для вошедших без подтверждения.
 * what — уже переведённое продолжение фразы «без этого …» (например, t("applications.verifyWhat")).
 */
export async function VerifyBanner({ user, what }: { user: CurrentUser; what: string }) {
  if (user.emailVerifiedAt) return null;
  const t = await getTranslations("me");
  return (
    <div role="status" className="neu-inset flex flex-wrap items-center gap-3 rounded-xl px-4 py-3 text-sm">
      <span className="font-semibold text-[color:var(--soft-text)]">{t("verify.text", { email: user.email, what })}</span>
      <form action={resendVerificationAction} className="ml-auto">
        <button type="submit" className="neu-btn-sm" style={{ minHeight: 36, fontSize: 13 }}>
          {t("verify.resend")}
        </button>
      </form>
    </div>
  );
}
