"use client";

/* eslint-disable @next/next/no-img-element */
import { useState } from "react";

/** Логотип компании, а если его нет или он не загрузился, квадрат с инициалами. */
export function CompanyAvatar({
  name,
  logoUrl,
  initials,
  size = 52,
  rounded = 10,
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
  const style = { width: size, height: size, borderRadius: rounded };
  if (logoUrl && !broken) {
    return (
      <span className={`flex flex-none items-center justify-center overflow-hidden border border-line bg-white ${className}`} style={style}>
        <img src={logoUrl} alt="" width={size} height={size} loading="lazy" onError={() => setBroken(true)} className="h-full w-full object-contain p-1" />
      </span>
    );
  }
  return (
    <span
      aria-hidden="true"
      className={`flex flex-none items-center justify-center bg-ink font-extrabold text-white ${className}`}
      style={{ ...style, fontSize: Math.round(size * 0.34) }}
    >
      {initials ?? name.slice(0, 2).toUpperCase()}
    </span>
  );
}
