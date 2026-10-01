// Liquid-glass ambient field: a deep gradient with slow-drifting colour blobs
// that the translucent tiles and cards blur over. `accent` tints one blob so
// the field responds to whatever is playing.
export function AmbientField({ accent = "#B85CFF", active = false }: { accent?: string; active?: boolean }) {
  const blobs = [
    { c: "#8C8AB8", x: "12%", y: "8%", s: 520, d: 26, delay: 0 },
    { c: "#5B6CFF", x: "78%", y: "18%", s: 460, d: 32, delay: -8 },
    { c: accent, x: "50%", y: "46%", s: 560, d: 22, delay: -4 },
    { c: "#FF5FB0", x: "20%", y: "72%", s: 420, d: 36, delay: -14 },
    { c: "#1FBFA8", x: "84%", y: "80%", s: 380, d: 30, delay: -20 },
  ];
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" style={{ background: "linear-gradient(180deg, #6F6DAB 0%, #4A4A8E 40%, #24264F 75%, #0E1024 100%)" }}>
      {blobs.map((b, i) => (
        <span
          key={i}
          className="absolute block rounded-full mix-blend-screen"
          style={{
            left: b.x, top: b.y, width: b.s, height: b.s,
            marginLeft: -b.s / 2, marginTop: -b.s / 2,
            background: `radial-gradient(circle at 40% 40%, ${b.c} 0%, ${b.c}80 35%, transparent 70%)`,
            filter: "blur(40px)",
            opacity: active && i === 2 ? 0.95 : 0.7,
            animation: `pmg-drift-${i % 3} ${b.d}s ease-in-out ${b.delay}s infinite alternate${active && i === 2 ? ", pmg-breathe 2.4s ease-in-out infinite alternate" : ""}`,
            transition: "opacity 1.2s ease, background 1.2s ease",
          }}
        />
      ))}
      {/* fine grain so the glass has something to catch */}
      <span className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence baseFrequency='0.9' numOctaves='2'/></filter><rect width='120' height='120' filter='url(%23n)' opacity='0.6'/></svg>\")" }} />
      <style>{`
        @keyframes pmg-drift-0 { from { transform: translate(0,0) scale(1) } to { transform: translate(90px,60px) scale(1.15) } }
        @keyframes pmg-drift-1 { from { transform: translate(0,0) scale(1.1) } to { transform: translate(-110px,40px) scale(0.9) } }
        @keyframes pmg-drift-2 { from { transform: translate(0,0) scale(0.95) } to { transform: translate(60px,-90px) scale(1.2) } }
        @keyframes pmg-breathe { from { transform: scale(1) } to { transform: scale(1.12) } }
        @media (prefers-reduced-motion: reduce) { .pmg-ambient span { animation: none !important } }
      `}</style>
    </div>
  );
}
