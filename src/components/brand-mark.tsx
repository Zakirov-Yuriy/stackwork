import { useId } from "react";

/* Контур буквы S из Manrope 800 (тот же, что в фавиконке src/app/icon.svg), viewBox 0 0 64 64 */
const S_PATH = "M32.27 47.63Q28.91 47.63 26.21 46.44Q23.52 45.26 21.78 43.04Q20.05 40.83 19.59 37.76L25.55 36.88Q26.18 39.48 28.16 40.89Q30.13 42.30 32.65 42.30Q34.06 42.30 35.38 41.85Q36.70 41.41 37.55 40.55Q38.41 39.69 38.41 38.43Q38.41 37.97 38.27 37.54Q38.13 37.11 37.82 36.73Q37.50 36.35 36.92 36.02Q36.35 35.68 35.47 35.41L27.61 33.10Q26.73 32.85 25.56 32.38Q24.40 31.92 23.31 31.06Q22.21 30.20 21.49 28.78Q20.77 27.36 20.77 25.20Q20.77 22.16 22.30 20.14Q23.83 18.12 26.39 17.14Q28.95 16.15 32.06 16.17Q35.19 16.21 37.65 17.24Q40.11 18.27 41.77 20.24Q43.42 22.20 44.16 25.03L37.98 26.08Q37.65 24.61 36.75 23.61Q35.84 22.60 34.59 22.07Q33.34 21.55 31.98 21.51Q30.63 21.46 29.45 21.87Q28.26 22.28 27.52 23.06Q26.77 23.84 26.77 24.91Q26.77 25.89 27.38 26.51Q27.99 27.13 28.91 27.51Q29.84 27.89 30.80 28.14L36.05 29.57Q37.23 29.88 38.66 30.40Q40.09 30.91 41.40 31.83Q42.71 32.74 43.56 34.23Q44.41 35.72 44.41 38.01Q44.41 40.45 43.39 42.26Q42.37 44.08 40.65 45.27Q38.93 46.45 36.76 47.04Q34.58 47.63 32.27 47.63";

/**
 * Знак бренда: буква S на мягком «приподнятом» квадрате, один в один с фавиконкой.
 * Квадрат рисуется CSS (.brand-mark), буква — SVG-контуром, поэтому чёткая в любом размере.
 */
export function BrandMark({ size = 40, className = "" }: { size?: number; className?: string }) {
  const id = useId();
  const shadow = Math.max(2, Math.round(size * 0.12));
  const blur = Math.round(size * 0.3);
  return (
    <span
      aria-hidden="true"
      className={`brand-mark inline-flex flex-none items-center justify-center ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.28),
        boxShadow: `${shadow}px ${shadow}px ${blur}px var(--brand-mark-dark), -${shadow}px -${shadow}px ${blur}px var(--brand-mark-light)`,
      }}
    >
      <svg viewBox="6 6 52 52" width={size} height={size} role="img" aria-hidden="true">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#5a8df2" />
            <stop offset="1" stopColor="#2d62d0" />
          </linearGradient>
        </defs>
        <path d={S_PATH} fill={`url(#${id})`} />
      </svg>
    </span>
  );
}
