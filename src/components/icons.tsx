type IconProps = { size?: number; className?: string; stroke?: string };

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
});

export function SearchIcon({ size = 20, stroke = "currentColor", className }: IconProps) {
  return (
    <svg {...base(size)} stroke={stroke} className={className}>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </svg>
  );
}

export function PinIcon({ size = 20, stroke = "currentColor", className }: IconProps) {
  return (
    <svg {...base(size)} stroke={stroke} className={className}>
      <path d="M12 21s7-6.2 7-11a7 7 0 0 0-14 0c0 4.8 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

export function BookmarkIcon({ size = 18, stroke = "currentColor", className }: IconProps) {
  return (
    <svg {...base(size)} stroke={stroke} className={className}>
      <path d="M6 3h12v18l-6-4-6 4z" />
    </svg>
  );
}

export function ShareIcon({ size = 18, stroke = "currentColor", className }: IconProps) {
  return (
    <svg {...base(size)} stroke={stroke} className={className}>
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" />
    </svg>
  );
}

export function ChevronRightIcon({ size = 16, stroke = "currentColor", className }: IconProps) {
  return (
    <svg {...base(size)} stroke={stroke} className={className}>
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}
