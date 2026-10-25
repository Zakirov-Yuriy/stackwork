"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex w-full max-w-[1180px] flex-1 flex-col items-start gap-4 px-6 py-16">
      <p className="font-mono text-sm text-[color:var(--soft-muted)]">500</p>
      <h1 className="m-0 text-[32px] font-extrabold leading-tight tracking-tight">Что-то сломалось</h1>
      <p className="m-0 max-w-[560px] text-base leading-relaxed text-[color:var(--soft-muted)]">
        Мы уже знаем об ошибке. Попробуйте обновить страницу; если не помогает, вернитесь на главную.
        {error.digest ? <span className="block pt-2 font-mono text-xs">Код: {error.digest}</span> : null}
      </p>
      <div className="flex flex-wrap gap-3 pt-2">
        <button type="button" onClick={reset} className="neu-primary-sm">
          Попробовать снова
        </button>
        <Link href="/" className="neu-btn-sm">
          На главную
        </Link>
      </div>
    </main>
  );
}
