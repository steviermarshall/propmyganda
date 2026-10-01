import type { ReactNode } from "react";
import type { Tone } from "@/lib/spotifyCatalog";

// Shared pieces for the Records page: the glow tiles, dot-matrix digits,
// the tick ruler and the pill button from the reference interface.

export const TONES: Record<Tone | "ink", { base: string; glow: string; text: string; soft: string }> = {
  pink:  { base: "#E7B8D2", glow: "#FF2F9C", text: "#2A1020", soft: "rgba(42,16,32,0.55)" },
  navy:  { base: "#15337F", glow: "#3C7BFF", text: "#FFFFFF", soft: "rgba(255,255,255,0.6)" },
  sage:  { base: "#A9CBB7", glow: "#1E6B4A", text: "#0E1F17", soft: "rgba(14,31,23,0.55)" },
  ember: { base: "#CF4F1F", glow: "#3B5BFF", text: "#FFFFFF", soft: "rgba(255,255,255,0.65)" },
  plum:  { base: "#2B1A3A", glow: "#B85CFF", text: "#FFFFFF", soft: "rgba(255,255,255,0.6)" },
  ink:   { base: "#0C0C0E", glow: "#FFD230", text: "#FFFFFF", soft: "rgba(255,255,255,0.5)" },
};

export function Tile({ tone, children, className = "" }: { tone: Tone | "ink"; children: ReactNode; className?: string }) {
  const t = TONES[tone];
  return (
    <section
      className={`relative isolate overflow-hidden rounded-[28px] border border-white/10 ${className}`}
      style={{ background: t.base, color: t.text }}
    >
      {children}
    </section>
  );
}

/** Soft radial glow sitting behind a tile's centrepiece. */
export function Glow({ tone, className = "" }: { tone: Tone | "ink"; className?: string }) {
  const t = TONES[tone];
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute -z-10 ${className}`}
      style={{ background: `radial-gradient(closest-side, ${t.glow} 0%, ${t.glow}99 35%, transparent 72%)`, filter: "blur(18px)" }}
    />
  );
}

// 5x7 dot-matrix glyphs for the LED-style numbers in the reference.
const GLYPHS: Record<string, string[]> = {
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
  "3": ["11111", "00010", "00100", "00010", "00001", "10001", "01110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
  ":": ["00000", "00100", "00000", "00000", "00000", "00100", "00000"],
  "-": ["00000", "00000", "00000", "01110", "00000", "00000", "00000"],
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
};

export function DotDigits({ value, size = 6, className = "", dim = 0.18 }: { value: string; size?: number; className?: string; dim?: number }) {
  const chars = value.split("").filter((c) => GLYPHS[c]);
  const gap = size * 0.55;
  const cell = size + gap;
  const charW = 5 * cell + cell; // 5 columns + a spacer column
  const width = chars.length * charW - cell;
  const height = 7 * cell - gap;
  return (
    <svg
      role="img"
      aria-label={value}
      viewBox={`0 0 ${width} ${height}`}
      style={{ height: `${7 * cell - gap}px` }}
      className={`block ${className}`}
      fill="currentColor"
    >
      {chars.map((c, ci) =>
        GLYPHS[c].map((row, ri) =>
          row.split("").map((bit, bi) => (
            <circle
              key={`${ci}-${ri}-${bi}`}
              cx={ci * charW + bi * cell + size / 2}
              cy={ri * cell + size / 2}
              r={size / 2}
              opacity={bit === "1" ? 1 : dim}
            />
          )),
        ),
      )}
    </svg>
  );
}

/** Tick ruler with a marker, like the reminder dial. `value` is 0–1. */
export function Ruler({ value, ticks = 41, accent = "#FFD230", className = "" }: { value: number; ticks?: number; accent?: string; className?: string }) {
  const v = Math.max(0, Math.min(1, value || 0));
  return (
    <div className={`relative flex h-6 items-end justify-between ${className}`} aria-hidden="true">
      {Array.from({ length: ticks }, (_, i) => {
        const major = i % 5 === 0;
        const passed = i / (ticks - 1) <= v;
        return (
          <span
            key={i}
            className="w-px rounded-full"
            style={{ height: major ? 16 : 8, background: "currentColor", opacity: passed ? 0.9 : 0.25 }}
          />
        );
      })}
      <span
        className="absolute bottom-0 w-[2px] rounded-full transition-[left] duration-300"
        style={{ left: `calc(${v * 100}% - 1px)`, height: 24, background: accent }}
      />
    </div>
  );
}

export function Pill({
  children, href, onClick, tone = "dark", className = "", ariaLabel,
}: { children: ReactNode; href?: string; onClick?: () => void; tone?: "dark" | "light"; className?: string; ariaLabel?: string }) {
  const cls = `inline-flex items-center gap-3 rounded-full py-2.5 pl-5 pr-2 text-[13px] font-medium tracking-tight transition-transform active:scale-[0.98] ${
    tone === "dark" ? "bg-[#111113]/80 text-white hover:bg-[#111113]" : "bg-white/85 text-black hover:bg-white"
  } ${className}`;
  const plus = (
    <span className={`flex h-7 w-7 items-center justify-center rounded-full ${tone === "dark" ? "bg-white text-black" : "bg-black text-white"}`} aria-hidden="true">
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M6 1v10M1 6h10" /></svg>
    </span>
  );
  if (href) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={cls} aria-label={ariaLabel}>
        {children}{plus}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} className={cls} aria-label={ariaLabel}>
      {children}{plus}
    </button>
  );
}

export function PlayIcon({ paused }: { paused: boolean }) {
  return paused ? (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden="true"><path d="M3 1.5v11l9-5.5z" /></svg>
  ) : (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden="true"><rect x="2.5" y="1.5" width="3" height="11" rx="0.8" /><rect x="8.5" y="1.5" width="3" height="11" rx="0.8" /></svg>
  );
}

/** Three bouncing bars shown beside the track that is playing. */
export function Equalizer({ paused }: { paused: boolean }) {
  return (
    <span className="flex h-3 items-end gap-[2px]" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-[3px] rounded-sm bg-current"
          style={{
            height: paused ? 4 : undefined,
            animation: paused ? "none" : `pmg-eq 0.9s ease-in-out ${i * 0.15}s infinite alternate`,
          }}
        />
      ))}
      <style>{`@keyframes pmg-eq { from { height: 3px } to { height: 12px } }`}</style>
    </span>
  );
}
