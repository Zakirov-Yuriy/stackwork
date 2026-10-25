"use client";

import { useState } from "react";

/**
 * Обёртка для меню на узких экранах: кнопка-гамбургер и раскрывающийся блок.
 * На md+ дети показываются всегда, кнопка скрыта.
 */
export function MobileMenu({ children, label = "Меню" }: { children: React.ReactNode; label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        aria-expanded={open}
        aria-controls="mobile-menu"
        aria-label={open ? "Закрыть меню" : "Открыть меню"}
        onClick={() => setOpen((v) => !v)}
        className="neu-btn-sm ml-auto h-11 w-11 px-0 md:hidden"
      >
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
        </svg>
        <span className="sr-only">{label}</span>
      </button>
      <div id="mobile-menu" className={`${open ? "flex" : "hidden"} w-full basis-full flex-col gap-3 pb-2 md:flex md:w-auto md:basis-auto md:flex-row md:items-center md:gap-8 md:pb-0 md:ml-0 md:flex-1`}>
        {children}
      </div>
    </>
  );
}

/** Сворачиваемый блок (фильтры на телефоне). На lg+ всегда раскрыт. */
export function Collapsible({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex w-full flex-col gap-3 lg:contents">
      <button type="button" aria-expanded={open} onClick={() => setOpen((v) => !v)} className="neu-btn-sm w-full justify-between lg:hidden">
        <span>{title}</span>
        <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ transform: open ? "rotate(180deg)" : undefined }}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      <div className={`${open ? "block" : "hidden"} lg:contents`}>{children}</div>
    </div>
  );
}
