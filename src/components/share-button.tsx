"use client";

import { useState } from "react";
import { ShareIcon } from "./icons";

/** Поделиться: системный диалог на телефоне, иначе копирование ссылки. */
export function ShareButton({ title, path }: { title: string; path: string }) {
  const [done, setDone] = useState(false);

  async function share() {
    const url = `${window.location.origin}${path}`;
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setDone(true);
      setTimeout(() => setDone(false), 2000);
    } catch {
      /* пользователь закрыл диалог */
    }
  }

  return (
    <button type="button" onClick={share} aria-label="Поделиться вакансией" title="Поделиться" className="neu-btn-sm h-12 px-3">
      <ShareIcon />
      <span aria-live="polite" className={done ? "text-sm" : "sr-only"}>
        {done ? "Ссылка скопирована" : "Поделиться"}
      </span>
    </button>
  );
}
