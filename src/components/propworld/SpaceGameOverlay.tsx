import { Suspense, useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { AnimatePresence, motion } from "framer-motion";
import * as THREE from "three";
import { useIsMobile } from "@/hooks/use-mobile";
import SpaceGame from "./SpaceGame";
import CosmicHUD from "./CosmicHUD";

interface HudState {
  score: number;
  hp: number;
  wave: number;
  gameOver: boolean;
  waveComplete: boolean;
}

function GameHUD({ onRestart }: { onRestart: () => void }) {
  const [hud, setHud] = useState<HudState>({ score: 0, hp: 10, wave: 1, gameOver: false, waveComplete: false });
  const wcTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const d = (e as CustomEvent).detail as HudState;
      setHud((prev) => ({ ...prev, ...d }));
      if (d.waveComplete) {
        if (wcTimer.current) clearTimeout(wcTimer.current);
        wcTimer.current = setTimeout(() => setHud((prev) => ({ ...prev, waveComplete: false })), 2500);
      }
    };
    window.addEventListener("game:hud", handler);
    return () => {
      window.removeEventListener("game:hud", handler);
      if (wcTimer.current) clearTimeout(wcTimer.current);
    };
  }, []);

  const segments = Array.from({ length: 10 }, (_, i) => i < hud.hp);

  return (
    <div className="pointer-events-none absolute inset-0">
      <div className="absolute left-6 top-36">
        <p className="mb-0.5 text-[9px] uppercase tracking-[0.4em] text-cyan-300/60">Score</p>
        <p className="text-2xl font-bold tabular-nums text-cyan-200 drop-shadow-[0_0_8px_rgba(0,255,238,0.6)]">{hud.score.toLocaleString()}</p>
      </div>
      <div className="absolute left-1/2 top-24 -translate-x-1/2 text-center">
        <p className="mb-0.5 text-[9px] uppercase tracking-[0.4em] text-cyan-300/60">Wave</p>
        <p className="text-xl font-bold text-cyan-100">{hud.wave}</p>
      </div>
      <div className="absolute right-6 top-24 flex flex-col items-end">
        <p className="mb-1 text-[9px] uppercase tracking-[0.4em] text-cyan-300/60">Hull</p>
        <div className="flex gap-1">
          {segments.map((alive, i) => (
            <div key={i} className={`h-3 w-3 rounded-sm border transition-all duration-300 ${alive ? "border-cyan-300 bg-cyan-400 shadow-[0_0_5px_rgba(0,255,238,0.8)]" : "border-cyan-800/50 bg-transparent"}`} />
          ))}
        </div>
      </div>

      <AnimatePresence>
        {hud.waveComplete && (
          <motion.div key="wc" initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.1 }} className="absolute inset-0 flex items-center justify-center">
            <p className="font-display text-4xl uppercase tracking-[0.15em] text-cyan-200 drop-shadow-[0_0_24px_rgba(0,255,238,0.8)]">Wave {hud.wave} Clear</p>
          </motion.div>
        )}
      </AnimatePresence>

      {hud.gameOver && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60">
          <p className="mb-3 font-display text-6xl uppercase text-red-400 drop-shadow-[0_0_24px_rgba(255,60,0,0.9)]">Game Over</p>
          <p className="mb-6 text-lg text-white/70">Score: <span className="font-bold text-cyan-300">{hud.score.toLocaleString()}</span></p>
          <button onClick={onRestart} className="pointer-events-auto border border-cyan-400/50 px-6 py-3 text-[11px] uppercase tracking-[0.3em] text-cyan-100 transition-colors hover:bg-cyan-400/10">
            Play Again
          </button>
        </div>
      )}
    </div>
  );
}

/** Blue tree: full-screen space shooter that launches straight away, like PMG Fight. */
export default function SpaceGameOverlay({ onExit }: { onExit: () => void }) {
  const isMobile = useIsMobile();
  const [run, setRun] = useState(0);
  const shootRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onExit(); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onExit]);

  return (
    <div className="relative h-full w-full bg-[#02030a] text-white">
      <Canvas
        key={run}
        camera={{ position: [0, 3, 10], fov: isMobile ? 75 : 62 }}
        dpr={[1, 1]}
        gl={{ antialias: false, toneMapping: THREE.ACESFilmicToneMapping, powerPreference: "high-performance" }}
      >
        <color attach="background" args={["#02030a"]} />
        <ambientLight intensity={0.35} color="#5a7aff" />
        <directionalLight position={[3, 10, 6]} intensity={1.1} color="#dff6ff" />
        <Suspense fallback={null}>
          <SpaceGame isMobile onRegisterShoot={(fn) => { shootRef.current = fn; }} />
        </Suspense>
      </Canvas>
      <CosmicHUD />
      <GameHUD key={run} onRestart={() => { localStorage.setItem("pmg_score", "0"); setRun((r) => r + 1); }} />
      <p className="pointer-events-none absolute inset-x-0 bottom-6 text-center text-[10px] uppercase tracking-[0.35em] text-cyan-200/60">
        Drag to steer · Tap / Space to fire
      </p>

      <button
        onClick={onExit}
        className="absolute left-4 top-20 z-10 border border-cyan-300/40 bg-black/40 px-4 py-2 text-[10px] uppercase tracking-[0.3em] text-cyan-100 backdrop-blur transition-colors hover:bg-cyan-300/15"
      >
        ← Propworld
      </button>
    </div>
  );
}
