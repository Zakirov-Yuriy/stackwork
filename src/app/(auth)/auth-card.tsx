import Link from "next/link";

/** Карточка с переключателем «Вход / Регистрация», общая для обеих страниц. */
export function AuthCard({ active, next, children }: { active: "login" | "register"; next: string; children: React.ReactNode }) {
  const q = next !== "/" ? `?next=${encodeURIComponent(next)}` : "";
  return (
    <div className="neu-card box-border w-full max-w-[460px] p-7 sm:p-9">
      <nav aria-label="Вход или регистрация" className="neu-tabs grid grid-cols-2 gap-1.5">
        <Link href={`/login${q}`} aria-current={active === "login" ? "page" : undefined} className="neu-tab inline-flex items-center justify-center">
          Вход
        </Link>
        <Link href={`/register${q}`} aria-current={active === "register" ? "page" : undefined} className="neu-tab inline-flex items-center justify-center">
          Регистрация
        </Link>
      </nav>
      <div className="mt-8">{children}</div>
    </div>
  );
}

export function AuthTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-7 flex flex-col items-center gap-1.5 text-center">
      <h1 className="m-0 text-[28px] font-extrabold leading-tight tracking-tight text-[color:var(--soft-text)]">{title}</h1>
      <p className="m-0 text-[15px] text-[color:var(--soft-muted)]">{subtitle}</p>
    </div>
  );
}

export function SoftLabel({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="text-sm font-bold text-[color:var(--soft-text)]">
      {children}
    </label>
  );
}

export function SoftError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div role="alert" className="neu-inset rounded-xl px-4 py-3 text-sm font-semibold text-[#B3261E]">
      {message}
    </div>
  );
}

/** Разделитель «или» и кнопки входа через соцсети. Пока без OAuth: кнопки отключены. */
export function SocialRow() {
  return (
    <>
      <div className="my-7 flex items-center gap-4 text-xs font-bold uppercase tracking-[0.12em] text-[color:var(--soft-muted)]">
        <span className="h-px flex-1 bg-[color:var(--soft-dark)]" />
        <span>или</span>
        <span className="h-px flex-1 bg-[color:var(--soft-dark)]" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <button type="button" disabled title="Вход через Google появится после подключения OAuth" className="neu-btn inline-flex items-center justify-center gap-2.5">
          <GoogleIcon />
          Google
        </button>
        <button type="button" disabled title="Вход через GitHub появится после подключения OAuth" className="neu-btn inline-flex items-center justify-center gap-2.5">
          <GitHubIcon />
          GitHub
        </button>
      </div>
      <p className="mt-3 text-center text-xs text-[color:var(--soft-muted)]">Вход через Google и GitHub подключим позже</p>
    </>
  );
}

function GoogleIcon() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M21.6 12.23c0-.68-.06-1.33-.17-1.96H12v3.71h5.38a4.6 4.6 0 0 1-2 3.02v2.5h3.24c1.9-1.75 2.98-4.32 2.98-7.27z" />
      <path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.42l-3.24-2.5c-.9.6-2.04.95-3.38.95-2.6 0-4.8-1.75-5.58-4.1H3.07v2.58A10 10 0 0 0 12 22z" />
      <path fill="#FBBC05" d="M6.42 13.93A6 6 0 0 1 6.1 12c0-.67.12-1.32.32-1.93V7.49H3.07A10 10 0 0 0 2 12c0 1.61.39 3.14 1.07 4.51l3.35-2.58z" />
      <path fill="#EA4335" d="M12 5.98c1.47 0 2.78.5 3.82 1.5l2.86-2.87A9.98 9.98 0 0 0 12 2a10 10 0 0 0-8.93 5.49l3.35 2.58C7.2 7.73 9.4 5.98 12 5.98z" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.52 2.34 1.08 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.56-1.11-4.56-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02A9.6 9.6 0 0 1 12 6.84c.85 0 1.7.12 2.5.34 1.9-1.29 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0 0 12 2z" />
    </svg>
  );
}
