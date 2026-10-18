import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

// Form pieces for /start in the brand system: ink, bone, one yellow accent, sharp corners.

export function Label({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <span className="mb-1.5 flex items-baseline justify-between font-mono text-[10px] uppercase tracking-[0.18em] text-[#9A9A9E]">
      <span>{children}</span>
      {hint && <span className="normal-case tracking-normal">{hint}</span>}
    </span>
  );
}

const field = "w-full border border-[#F2EFE9]/30 bg-transparent px-3 py-3 text-[15px] text-[#F2EFE9] outline-none placeholder:text-[#F2EFE9]/30 focus:border-[#FFD230]";

export function Input({ label, hint, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  return (
    <label className="block">
      <Label hint={hint}>{label}</Label>
      <input {...props} className={`${field} ${props.className ?? ""}`} />
    </label>
  );
}

export function Select({ label, hint, children, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { label: string; hint?: string }) {
  return (
    <label className="block">
      <Label hint={hint}>{label}</Label>
      <select {...props} className={`${field} appearance-none bg-[#0B0B0B]`}>{children}</select>
    </label>
  );
}

export function Textarea({ label, hint, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; hint?: string }) {
  return (
    <label className="block">
      <Label hint={hint}>{label}</Label>
      <textarea {...props} className={`${field} min-h-[96px]`} />
    </label>
  );
}

export function Toggle({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} aria-pressed={checked} className="flex w-full items-center justify-between border border-[#F2EFE9]/30 px-3 py-3 text-left">
      <span>
        <span className="block text-[15px] text-[#F2EFE9]">{label}</span>
        {hint && <span className="block font-mono text-[10px] uppercase tracking-[0.14em] text-[#9A9A9E]">{hint}</span>}
      </span>
      <span className="ml-4 flex h-6 w-11 shrink-0 items-center border border-[#F2EFE9]/40 p-0.5" style={{ background: checked ? "#FFD230" : "transparent" }}>
        <span className="h-4 w-4 transition-transform duration-200" style={{ background: checked ? "#0B0B0B" : "#F2EFE9", transform: checked ? "translateX(20px)" : "none" }} />
      </span>
    </button>
  );
}

export function Button({ children, onClick, type = "button", disabled, tone = "yellow", className = "" }: { children: ReactNode; onClick?: () => void; type?: "button" | "submit"; disabled?: boolean; tone?: "yellow" | "ghost"; className?: string }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`px-6 py-4 font-mono text-[11px] uppercase tracking-[0.2em] transition-colors disabled:opacity-40 ${
        tone === "yellow" ? "bg-[#FFD230] text-[#0B0B0B] hover:bg-[#F2EFE9]" : "border border-[#F2EFE9]/40 text-[#F2EFE9] hover:border-[#F2EFE9]"
      } ${className}`}
    >
      {children}
    </button>
  );
}

export function Note({ children }: { children: ReactNode }) {
  return <p className="font-mono text-[11px] uppercase leading-5 tracking-[0.14em] text-[#9A9A9E]">{children}</p>;
}

export function ErrorLine({ children }: { children: ReactNode }) {
  return <p className="border border-[#FFD230] px-3 py-2 font-mono text-[11px] uppercase tracking-[0.14em] text-[#FFD230]">{children}</p>;
}
