"use client";

import { useState } from "react";

/** Копирует текст черновика в буфер обмена */
export function CopyButton({ text, className }: { text: string; className?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 2000);
        } catch {
          window.prompt("Скопируйте текст вручную", text);
        }
      }}
    >
      {done ? "Скопировано" : "Скопировать"}
    </button>
  );
}
