"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from "react";

/** Логотип компании в стиле Soft UI, а если его нет или он не загрузился, синий квадрат с инициалами. */
export function CompanyAvatar({
  name,
  logoUrl,
  initials,
  size = 52,
  rounded = 14,
  className = "",
}: {
  name: string;
  logoUrl?: string | null;
  initials?: string | null;
  size?: number;
  rounded?: number;
  className?: string;
}) {
  const [broken, setBroken] = useState(false);
  const img = useRef<HTMLImageElement>(null);
  // Ошибка загрузки могла случиться до гидрации, тогда onError не сработает: проверяем после монтирования
  useEffect(() => {
    const el = img.current;
    if (el && el.complete && el.naturalWidth === 0) setBroken(true);
  }, [logoUrl]);
  const style = { width: size, height: size, borderRadius: rounded };
  if (logoUrl && !broken) {
    return (
      <span className={`neu-raised flex flex-none items-center justify-center overflow-hidden bg-white ${className}`} style={{ ...style, background: "#fff" }}>
        <img ref={img} src={logoUrl} alt="" width={size} height={size} loading="lazy" onError={() => setBroken(true)} className="h-full w-full object-contain p-1.5" />
      </span>
    );
  }
  return (
    <span aria-hidden="true" className={`chip-blue flex flex-none items-center justify-center font-extrabold ${className}`} style={{ ...style, fontSize: Math.round(size * 0.34), padding: 0 }}>
      {initials ?? name.slice(0, 2).toUpperCase()}
    </span>
  );
}
