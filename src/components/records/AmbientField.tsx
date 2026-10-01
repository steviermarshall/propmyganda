// CRT field: black with a faint phosphor grid, scanlines and a soft vignette.
// `active` brightens the glow slightly while something is playing.
export function AmbientField({ active = false }: { accent?: string; active?: boolean }) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden bg-black">
      <span
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(120,255,190,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(120,255,190,0.06) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />
      <span
        className="absolute inset-0 transition-opacity duration-1000"
        style={{
          background: "radial-gradient(ellipse at 50% 35%, rgba(90,220,150,0.18) 0%, rgba(90,220,150,0.06) 35%, transparent 70%)",
          opacity: active ? 1 : 0.6,
          animation: active ? "pmg-breathe 2.4s ease-in-out infinite alternate" : undefined,
        }}
      />
      <span className="absolute inset-0" style={{ background: "repeating-linear-gradient(0deg, rgba(0,0,0,0.35) 0 1px, transparent 1px 3px)" }} />
      <span className="absolute inset-0" style={{ background: "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.75) 100%)" }} />
      <style>{`
        @keyframes pmg-breathe { from { transform: scale(1) } to { transform: scale(1.06) } }
        @keyframes pmg-blink { 0%, 49% { opacity: 1 } 50%, 100% { opacity: 0 } }
        @media (prefers-reduced-motion: reduce) { .pmg-ambient * { animation: none !important } }
      `}</style>
    </div>
  );
}
