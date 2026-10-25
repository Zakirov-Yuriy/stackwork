import { resendVerificationAction } from "@/app/(auth)/actions";
import type { CurrentUser } from "@/lib/session";

/** Плашка «подтвердите почту» для вошедших без подтверждения. */
export function VerifyBanner({ user, what }: { user: CurrentUser; what: string }) {
  if (user.emailVerifiedAt) return null;
  return (
    <div role="status" className="neu-inset flex flex-wrap items-center gap-3 rounded-xl px-4 py-3 text-sm">
      <span className="font-semibold text-[color:var(--soft-text)]">
        Подтвердите почту {user.email}: без этого {what}. Письмо со ссылкой отправлено при регистрации.
      </span>
      <form action={resendVerificationAction} className="ml-auto">
        <button type="submit" className="neu-btn-sm" style={{ minHeight: 36, fontSize: 13 }}>
          Отправить письмо ещё раз
        </button>
      </form>
    </div>
  );
}
