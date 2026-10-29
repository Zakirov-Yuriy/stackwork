/* Общие примитивы форм: подписи, поля, кнопки. Серверные, без состояния. */

export const fieldCls =
  "box-border min-h-11 w-full rounded-lg border border-line-2 bg-card px-3 text-[15px] outline-none focus:border-ink focus:ring-2 focus:ring-ink/10 placeholder:text-muted-2";
export const textareaCls =
  "box-border w-full resize-y rounded-lg border border-line-2 bg-card px-3 py-2.5 text-[15px] leading-relaxed outline-none focus:border-ink focus:ring-2 focus:ring-ink/10 placeholder:text-muted-2";
export const labelCls = "text-sm font-bold";
export const hintCls = "text-xs text-muted-2";
export const primaryBtn =
  "inline-flex min-h-12 items-center justify-center rounded-[10px] bg-accent px-6 text-[15px] font-extrabold text-ink hover:brightness-95 disabled:opacity-60";
export const secondaryBtn =
  "inline-flex min-h-12 items-center justify-center rounded-[10px] border border-line-2 bg-card px-[18px] text-[15px] font-bold text-ink hover:border-ink disabled:opacity-60";

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
    <div className={`flex flex-col gap-1.5 ${className}`}>
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
    <div role="alert" className="rounded-lg border border-[#E8B4B4] bg-[#FBEDED] px-3.5 py-2.5 text-sm font-semibold text-[#8A1F1F]">
      {message}
    </div>
  );
}

export function SuccessBanner({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div role="status" className="rounded-lg border border-[#BFE3CF] bg-[#EAF7EF] px-3.5 py-2.5 text-sm font-semibold text-[#1F6F58]">
      {message}
    </div>
  );
}

/** Пилюля-радио или чекбокс (стиль из макета: выбранная становится тёмной) */
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
    <label
      className={`tag-pill relative inline-flex min-h-11 cursor-pointer items-center rounded-full border border-line-2 px-4 text-sm font-bold ${mono ? "font-mono font-medium" : ""}`}
    >
      <input type={type} name={name} value={value} defaultChecked={defaultChecked} />
      <span>{label}</span>
    </label>
  );
}
