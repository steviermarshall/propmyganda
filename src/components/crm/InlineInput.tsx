import { useEffect, useRef, useState } from "react";

interface Props {
  value: string | number | null;
  onSave: (v: string) => Promise<void> | void;
  placeholder?: string;
  type?: "text" | "number" | "date";
  className?: string;
}

export default function InlineInput({ value, onSave, placeholder, type = "text", className = "" }: Props) {
  const [local, setLocal] = useState<string>(value == null ? "" : String(value));
  const [flash, setFlash] = useState(false);
  const initial = useRef(local);

  useEffect(() => {
    setLocal(value == null ? "" : String(value));
    initial.current = value == null ? "" : String(value);
  }, [value]);

  async function commit() {
    if (local === initial.current) return;
    await onSave(local);
    initial.current = local;
    setFlash(true);
    setTimeout(() => setFlash(false), 600);
  }

  return (
    <input
      type={type}
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
      placeholder={placeholder}
      className={`bg-black border border-white/10 text-white text-xs px-2 py-1 font-mono w-full ${
        flash ? "animate-saved-flash" : ""
      } ${className}`}
    />
  );
}
