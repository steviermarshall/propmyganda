import { useEffect, useState } from "react";

/**
 * CosmicHUD — overlay rendered above the canvas.
 * - Center crosshair reticle (pulses red when hovering a hittable)
 * - Subtle scanlines + holographic vignette
 * - Listens to window "cosmic:shake" to nudge the wrapping element
 */
export default function CosmicHUD() {
  const [hot, setHot] = useState(false);
  const [shake, setShake] = useState(0);

  useEffect(() => {
    const onHover = (e: Event) => setHot((e as CustomEvent).detail === true);
    const onShake = () => {
      setShake((s) => s + 1);
      setTimeout(() => setShake((s) => Math.max(0, s - 1)), 220);
    };
    window.addEventListener("cosmic:hover", onHover as EventListener);
    window.addEventListener("cosmic:shake", onShake);
    return () => {
      window.removeEventListener("cosmic:hover", onHover as EventListener);
      window.removeEventListener("cosmic:shake", onShake);
    };
  }, []);

  return (
    <div
      className={`pointer-events-none absolute inset-0 z-20 ${shake > 0 ? "animate-[cosmic-shake_0.22s_ease-out]" : ""}`}
      style={{ mixBlendMode: "normal" }}
    >
      {/* Scanlines */}
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(180,220,255,0.6) 0 1px, transparent 1px 3px)",
        }}
      />
      {/* Holographic vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 55%, rgba(40,10,80,0.55) 100%)",
        }}
      />
      {/* Crosshair reticle */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <Reticle hot={hot} />
      </div>

      <style>{`
        @keyframes cosmic-shake {
          0%   { transform: translate(0,0); }
          20%  { transform: translate(-4px, 3px); }
          40%  { transform: translate(5px, -2px); }
          60%  { transform: translate(-3px, -4px); }
          80%  { transform: translate(2px, 3px); }
          100% { transform: translate(0,0); }
        }
        @keyframes cosmic-pulse {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50%      { opacity: 1;   transform: scale(1.15); }
        }
      `}</style>
    </div>
  );
}

function Reticle({ hot }: { hot: boolean }) {
  const color = hot ? "#ff3a5a" : "#7ad8ff";
  const glow = hot ? "0 0 12px #ff3a5a, 0 0 22px #ff3a5a88" : "0 0 8px #7ad8ff66";
  return (
    <div
      style={{
        width: 44,
        height: 44,
        position: "relative",
        animation: hot ? "cosmic-pulse 0.6s ease-in-out infinite" : undefined,
      }}
    >
      {/* center dot */}
      <div
        style={{
          position: "absolute", left: "50%", top: "50%",
          transform: "translate(-50%,-50%)",
          width: 3, height: 3, borderRadius: 2,
          background: color, boxShadow: glow,
        }}
      />
      {/* ticks */}
      {[0, 90, 180, 270].map((deg) => (
        <div
          key={deg}
          style={{
            position: "absolute", left: "50%", top: "50%",
            width: 10, height: 1.5, background: color,
            boxShadow: glow,
            transform: `translate(-50%,-50%) rotate(${deg}deg) translateX(16px)`,
          }}
        />
      ))}
      {/* corner brackets */}
      {[
        { t: 0, l: 0, b: "auto", r: "auto", rot: 0 },
        { t: 0, r: 0, b: "auto", l: "auto", rot: 90 },
        { b: 0, r: 0, t: "auto", l: "auto", rot: 180 },
        { b: 0, l: 0, t: "auto", r: "auto", rot: 270 },
      ].map((s, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            ...s,
            width: 10, height: 10,
            borderTop: `1.5px solid ${color}`,
            borderLeft: `1.5px solid ${color}`,
            transform: `rotate(${s.rot}deg)`,
            boxShadow: glow,
          }}
        />
      ))}
    </div>
  );
}
