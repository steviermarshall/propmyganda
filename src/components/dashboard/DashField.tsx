import { ReactNode } from "react";

interface FieldProps {
  label: string;
  required?: boolean;
  children: ReactNode;
  hint?: string;
}

export function DashField({ label, required, children, hint }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] uppercase tracking-widest text-white/50 block">
        {label}
        {required && <span className="text-electric ml-1">*</span>}
      </label>
      {children}
      {hint && <p className="text-[10px] text-white/30">{hint}</p>}
    </div>
  );
}

const baseInput =
  "w-full bg-black border border-white/10 px-3 py-2 text-sm text-white focus:border-white/40 outline-none transition-colors placeholder:text-white/20";

export function DashInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${baseInput} ${props.className ?? ""}`} />;
}

export function DashTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${baseInput} resize-none ${props.className ?? ""}`} />;
}

export function DashSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${baseInput} ${props.className ?? ""}`} />;
}
