export function Logo({ size = "md" }: { size?: "md" | "sm" }) {
  const cls =
    size === "sm"
      ? "rounded-[5px] bg-ink px-1.5 py-[3px] text-xs text-white"
      : "rounded-md bg-accent px-2 py-1 text-[15px] text-ink";
  return (
    <span aria-hidden="true" className={`font-mono font-semibold ${cls}`}>
      &lt;/&gt;
    </span>
  );
}
