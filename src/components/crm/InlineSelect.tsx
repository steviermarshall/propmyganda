import { useState } from "react";

interface Props {
  value: string | null;
  options: { value: string; label: string }[];
  onChange: (v: string) => Promise<void> | void;
  className?: string;
}

export default function InlineSelect({ value, options, onChange, className = "" }: Props) {
  const [flash, setFlash] = useState(false);
  return (
    <select
      value={value ?? ""}
      onChange={async (e) => {
        await onChange(e.target.value);
        setFlash(true);
        setTimeout(() => setFlash(false), 600);
      }}
      className={`bg-black border border-white/10 text-white text-xs px-2 py-1 font-mono uppercase tracking-wider ${
        flash ? "animate-saved-flash" : ""
      } ${className}`}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
