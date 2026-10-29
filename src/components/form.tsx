/* Общие примитивы форм в стиле Soft UI. Серверные, без состояния. */

export const fieldCls = "neu-field";
export const textareaCls = "neu-field resize-y py-3 leading-relaxed";
export const labelCls = "text-sm font-bold text-[color:var(--soft-text)]";
export const hintCls = "text-xs text-[color:var(--soft-muted)]";
export const primaryBtn = "neu-primary px-6";
export const secondaryBtn = "neu-btn px-5";

export function Field({
  label,
  htmlFor,
  hint,
  children,
  className = "",
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <label htmlFor={htmlFor} className={labelCls}>
        {label}
      </label>
      {children}
      {hint ? <span className={hintCls}>{hint}</span> : null}
    </div>
  );
}

export function ErrorBanner({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div role="alert" className="neu-inset rounded-xl px-4 py-3 text-sm font-semibold text-[#B3261E]">
      {message}
    </div>
  );
}

export function SuccessBanner({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div role="status" className="neu-inset rounded-xl px-4 py-3 text-sm font-semibold text-[#1F6F58]">
      {message}
    </div>
  );
}

/** Пилюля-радио или чекбокс: выбранная вдавливается и синеет */
export function Pill({
  name,
  value,
  label,
  type = "radio",
  defaultChecked,
  mono = false,
}: {
  name: string;
  value: string;
  label: string;
  type?: "radio" | "checkbox";
  defaultChecked?: boolean;
  mono?: boolean;
}) {
  return (
    <label className={`neu-pill ${mono ? "font-mono" : "font-bold"}`} style={{ minHeight: 44, padding: "0 16px", fontSize: 14 }}>
      <input type={type} name={name} value={value} defaultChecked={defaultChecked} />
      <span>{label}</span>
    </label>
  );
}
