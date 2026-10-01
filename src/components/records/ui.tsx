import type { ReactNode } from "react";
import type { Tone } from "@/lib/spotifyCatalog";

// Terminal HUD pieces for the Records page: phosphor-green chamfered panels,
// log lines with dotted leaders, bracketed bars and the pill button used in the hero.

export const PHOS = { bright: "#D6FFE8", mid: "#8FE9B8", dim: "#4FA67C", faint: "#1F4A36", ink: "#06110C" };

// Tones are kept so callers don't change, but every panel is monochrome green now.
export const TONES: Record<Tone | "ink", { base: string; glow: string; text: string; soft: string }> = {
  pink:  { base: PHOS.ink, glow: PHOS.mid, text: PHOS.bright, soft: PHOS.dim },
  navy:  { base: PHOS.ink, glow: PHOS.mid, text: PHOS.bright, soft: PHOS.dim },
  sage:  { base: PHOS.ink, glow: PHOS.mid, text: PHOS.bright, soft: PHOS.dim },
  ember: { base: PHOS.ink, glow: PHOS.mid, text: PHOS.bright, soft: PHOS.dim },
  plum:  { base: PHOS.ink, glow: PHOS.mid, text: PHOS.bright, soft: PHOS.dim },
  ink:   { base: PHOS.ink, glow: PHOS.mid, text: PHOS.bright, soft: PHOS.dim },
};

const CHAMFER = "polygon(14px 0, calc(100% - 14px) 0, 100% 14px, 100% calc(100% - 14px), calc(100% - 14px) 100%, 14px 100%, 0 calc(100% - 14px), 0 14px)";

/** A HUD panel: chamfered corners, phosphor border, corner brackets, scanlines. */
export function Tile({ children, className = "", active = false }: { tone?: Tone | "ink"; children: ReactNode; className?: string; lift?: boolean; active?: boolean }) {
  return (
    <section
      className={`group/tile relative isolate font-mono uppercase tracking-[0.12em] ${className}`}
      style={{ color: PHOS.bright, filter: `drop-shadow(0 0 ${active ? 14 : 6}px rgba(120,255,190,${active ? 0.35 : 0.18}))` }}
    >
      <span aria-hidden="true" className="absolute inset-0" style={{ background: PHOS.mid, clipPath: CHAMFER }} />
      <span aria-hidden="true" className="absolute inset-px" style={{ background: "rgba(5,16,11,0.96)", clipPath: CHAMFER }} />
      {/* scanlines */}
      <span aria-hidden="true" className="pointer-events-none absolute inset-px" style={{ clipPath: CHAMFER, background: "repeating-linear-gradient(0deg, rgba(0,0,0,0.28) 0 1px, transparent 1px 3px)" }} />
      {/* corner brackets */}
      {["top-2 left-2", "top-2 right-2 rotate-90", "bottom-2 right-2 rotate-180", "bottom-2 left-2 -rotate-90"].map((pos) => (
        <span key={pos} aria-hidden="true" className={`absolute h-4 w-4 ${pos}`} style={{ borderTop: `2px solid ${PHOS.mid}`, borderLeft: `2px solid ${PHOS.mid}` }} />
      ))}
      <div className="relative">{children}</div>
    </section>
  );
}

/** Kept for callers; the HUD has no colour glow, only the phosphor halo on the panel. */
export function Glow(_: { tone?: Tone | "ink"; className?: string; active?: boolean }) {
  return null;
}

/** "> LABEL ........ VALUE" log line with a dotted leader. */
export function LogLine({ label, value, prompt = ">", dim = false }: { label: string; value: ReactNode; prompt?: string; dim?: boolean }) {
  return (
    <p className={`flex items-baseline gap-2 text-[10px] leading-5 ${dim ? "opacity-60" : ""}`}>
      <span className="shrink-0" style={{ color: PHOS.mid }}>{prompt}</span>
      <span className="shrink-0">{label}</span>
      <span className="min-w-[12px] flex-1 overflow-hidden whitespace-nowrap opacity-50" aria-hidden="true">
        {"................................................................"}
      </span>
      <span className="shrink-0 truncate text-right" style={{ maxWidth: "60%" }}>{value}</span>
    </p>
  );
}

/** Bracketed block bar: [████░░░░] 42% */
export function BlockBar({ value, cells = 18, label }: { value: number; cells?: number; label?: string }) {
  const v = Math.max(0, Math.min(1, value || 0));
  const filled = Math.round(v * cells);
  return (
    <p className="flex items-center gap-2 text-[10px]">
      {label && <span style={{ color: PHOS.mid }}>{label}</span>}
      <span className="flex items-center gap-[2px]" aria-hidden="true">
        <span style={{ color: PHOS.mid }}>[</span>
        {Array.from({ length: cells }, (_, i) => (
          <span key={i} className="inline-block h-[9px] w-[5px]" style={{ background: i < filled ? PHOS.bright : PHOS.faint, boxShadow: i < filled ? `0 0 4px ${PHOS.mid}` : undefined }} />
        ))}
        <span style={{ color: PHOS.mid }}>]</span>
      </span>
      <span className="tabular-nums">{Math.round(v * 100)}%</span>
    </p>
  );
}

/** Row in the status table at the foot of a panel. */
export function StatusRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between border px-2 py-1 text-[10px]" style={{ borderColor: PHOS.faint, background: "rgba(120,255,190,0.04)" }}>
      <span>{label}</span>
      <span className="truncate pl-3 text-right">{value}</span>
    </div>
  );
}

/** Keycap-style button: [ ◀ ] */
export function Key({ children, onClick, disabled, ariaLabel, active = false }: { children: ReactNode; onClick?: () => void; disabled?: boolean; ariaLabel: string; active?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className="flex h-7 min-w-[28px] items-center justify-center border px-1.5 text-[11px] transition-colors hover:bg-[rgba(120,255,190,0.15)] disabled:opacity-30"
      style={{ borderColor: active ? PHOS.bright : PHOS.dim, color: PHOS.bright, background: active ? "rgba(120,255,190,0.18)" : "transparent" }}
    >
      {children}
    </button>
  );
}

/** "→ CONTINUE_" link in the HUD footer. */
export function HudLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-2 border px-3 py-1.5 text-[10px] tracking-[0.18em] transition-colors hover:bg-[rgba(120,255,190,0.15)]"
      style={{ borderColor: PHOS.mid, color: PHOS.bright, clipPath: "polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)" }}
    >
      <span style={{ color: PHOS.mid }}>→</span>
      {children}
      <span className="inline-block h-[10px] w-[6px]" style={{ background: PHOS.bright, animation: "pmg-blink 1s steps(1) infinite" }} aria-hidden="true" />
    </a>
  );
}

/** Artwork rendered as a green phosphor scan. */
export function ScanImage({ src, className = "" }: { src: string | null; className?: string }) {
  return (
    <div className={`relative overflow-hidden ${className}`} style={{ background: PHOS.ink, border: `1px solid ${PHOS.faint}` }}>
      {src ? (
        <>
          <img src={src} alt="" loading="lazy" draggable={false} className="h-full w-full object-cover" style={{ filter: "grayscale(1) contrast(1.35) brightness(0.95)", imageRendering: "pixelated" }} />
          <span aria-hidden="true" className="absolute inset-0 mix-blend-multiply" style={{ background: PHOS.mid }} />
          <span aria-hidden="true" className="absolute inset-0 mix-blend-screen" style={{ background: "rgba(40,120,80,0.25)" }} />
        </>
      ) : (
        <span className="absolute inset-0 flex items-center justify-center text-[10px] opacity-50">NO SIGNAL</span>
      )}
      <span aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: "repeating-linear-gradient(0deg, rgba(0,0,0,0.45) 0 1px, transparent 1px 3px)" }} />
    </div>
  );
}

// The hero's pill button (outside the HUD area) is unchanged.
export function Pill({
  children, href, onClick, tone = "dark", className = "", ariaLabel,
}: { children: ReactNode; href?: string; onClick?: () => void; tone?: "dark" | "light"; className?: string; ariaLabel?: string }) {
  const cls = `inline-flex items-center gap-3 whitespace-nowrap rounded-full py-2.5 pl-5 pr-2 text-[13px] font-medium tracking-tight transition-transform active:scale-[0.98] ${
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
    <svg width="12" height="12" viewBox="0 0 14 14" fill="currentColor" aria-hidden="true"><path d="M3 1.5v11l9-5.5z" /></svg>
  ) : (
    <svg width="12" height="12" viewBox="0 0 14 14" fill="currentColor" aria-hidden="true"><rect x="2.5" y="1.5" width="3" height="11" rx="0.5" /><rect x="8.5" y="1.5" width="3" height="11" rx="0.5" /></svg>
  );
}
