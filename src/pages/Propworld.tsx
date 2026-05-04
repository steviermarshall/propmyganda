import { Suspense, lazy, useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import CosmicHUD from "@/components/propworld/CosmicHUD";

// ─── Game HUD ────────────────────────────────────────────────────────────────

interface HudState {
  score: number;
  hp: number;
  wave: number;
  gameOver: boolean;
  waveComplete: boolean;
}

function GameHUD() {
  const [hud, setHud] = useState<HudState>({ score: 0, hp: 5, wave: 1, gameOver: false, waveComplete: false });
  const wcTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const d = (e as CustomEvent).detail as HudState;
      setHud((prev) => ({ ...prev, ...d }));
      if (d.waveComplete) {
        if (wcTimerRef.current) clearTimeout(wcTimerRef.current);
        wcTimerRef.current = setTimeout(() => {
          setHud((prev) => ({ ...prev, waveComplete: false }));
        }, 2500);
      }
    };
    window.addEventListener("game:hud", handler);
    return () => window.removeEventListener("game:hud", handler);
  }, []);

  const maxHp = 5;
  const segments = Array.from({ length: maxHp }, (_, i) => i < hud.hp);

  return (
    <div className="pointer-events-none absolute inset-0">
      {/* Score — top right */}
      <div className="absolute top-5 right-6 text-right">
        <p className="text-[9px] tracking-[0.4em] uppercase text-cyan-300/60 mb-0.5">Score</p>
        <p className="text-2xl font-bold tabular-nums text-cyan-200 drop-shadow-[0_0_8px_rgba(0,255,238,0.6)]">
          {hud.score.toLocaleString()}
        </p>
      </div>

      {/* Wave — top center */}
      <div className="absolute top-5 left-1/2 -translate-x-1/2 text-center">
        <p className="text-[9px] tracking-[0.4em] uppercase text-cyan-300/60 mb-0.5">Wave</p>
        <p className="text-xl font-bold text-cyan-100">{hud.wave}</p>
      </div>

      {/* HP — top left */}
      <div className="absolute top-5 left-6">
        <p className="text-[9px] tracking-[0.4em] uppercase text-cyan-300/60 mb-1">Hull</p>
        <div className="flex gap-1">
          {segments.map((alive, i) => (
            <div
              key={i}
              className={`h-4 w-4 rounded-sm border transition-all duration-300 ${
                alive
                  ? "bg-cyan-400 border-cyan-300 shadow-[0_0_6px_rgba(0,255,238,0.8)]"
                  : "bg-transparent border-cyan-800/50"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Wave complete */}
      <AnimatePresence>
        {hud.waveComplete && (
          <motion.div
            key="wc"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <p className="text-3xl font-bold tracking-[0.2em] uppercase text-cyan-200 drop-shadow-[0_0_24px_rgba(0,255,238,0.8)]">
              Wave {hud.wave} Clear
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game over */}
      {hud.gameOver && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60">
          <p className="text-5xl font-bold tracking-[0.15em] uppercase text-red-400 mb-3 drop-shadow-[0_0_24px_rgba(255,60,0,0.9)]">
            Game Over
          </p>
          <p className="text-lg text-white/70 mb-6">
            Score: <span className="text-cyan-300 font-bold">{hud.score.toLocaleString()}</span>
          </p>
          <button
            className="pointer-events-auto text-[11px] tracking-[0.3em] uppercase border border-cyan-400/50 px-6 py-3 text-cyan-100 hover:bg-cyan-400/10 transition-colors"
            onClick={() => window.location.reload()}
          >
            Play Again
          </button>
        </div>
      )}
    </div>
  );
}

const PropworldScene = lazy(() => import("@/components/propworld/PropworldScene"));

type Mode = "forest" | "transitioning" | "theater" | "game";

const Propworld = () => {
  const [mode, setMode] = useState<Mode>("forest");

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-[#02060a] text-white">
      {/* Full-screen 3D scene */}
      <div className="absolute inset-0">
        <Suspense fallback={<div className="w-full h-full bg-[#02060a]" />}>
          <PropworldScene onModeChange={setMode} />
        </Suspense>
      </div>

      {/* Subtle vignette overlay for legibility */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />

      {/* Cosmic HUD overlay — theater and game */}
      {(mode === "theater" || mode === "game") && <CosmicHUD />}

      {/* Game HUD — score, HP, wave */}
      {mode === "game" && <GameHUD />}

      {/* Forest UI */}
      <AnimatePresence>
        {mode === "forest" && (
          <motion.div
            key="forest-ui"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-none absolute inset-x-0 top-24 md:top-28 flex flex-col items-center text-center px-6"
          >
            <p className="text-[10px] md:text-xs tracking-[0.4em] uppercase text-amber-200/80 mb-4">
              Propworld
            </p>
            <h1 className="text-4xl md:text-6xl font-bold uppercase tracking-tight">
              Two Ancient Trees
            </h1>
            <p className="mt-4 max-w-md text-sm md:text-base text-white/60">
              Tap the{" "}
              <span className="text-amber-300/90">amber tree</span> to enter The Room.
              <br />
              Tap the{" "}
              <span className="text-cyan-300/90">blue tree</span> to enter The Game.
            </p>
            <p className="mt-2 max-w-md text-[10px] md:text-xs tracking-[0.25em] uppercase text-white/40">
              Drag to look around
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cinematic transition: vignette + fade to black */}
      <AnimatePresence>
        {mode === "transitioning" && (
          <>
            <motion.div
              key="trans-vignette"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.95) 85%)",
              }}
            />
            <motion.div
              key="trans-fade"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 1, 0] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2.8, times: [0, 0.55, 0.85, 1], ease: "easeInOut" }}
              className="pointer-events-none absolute inset-0 bg-black"
            />
          </>
        )}
      </AnimatePresence>

      {/* Theater (Room) UI */}
      <AnimatePresence>
        {mode === "theater" && (
          <motion.div
            key="theater-ui"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-x-0 bottom-8 flex flex-col items-center px-6"
          >
            <p className="text-[10px] tracking-[0.4em] uppercase text-amber-200/70 mb-3">
              The Room · Drag to look · Pinch / scroll to move · Tap to kick
            </p>
            <button
              onClick={() => window.location.reload()}
              className="pointer-events-auto text-[10px] tracking-[0.3em] uppercase border border-amber-200/30 px-5 py-2.5 text-amber-100 hover:bg-amber-200/10 hover:border-amber-200/60 transition-colors"
            >
              ← Return to Forest
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game UI */}
      <AnimatePresence>
        {mode === "game" && (
          <motion.div
            key="game-ui"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-x-0 bottom-8 flex flex-col items-center px-6"
          >
            <p className="text-[10px] tracking-[0.4em] uppercase text-cyan-200/70 mb-3">
              The Game · Drag to look around
            </p>
            <button
              onClick={() => window.location.reload()}
              className="pointer-events-auto text-[10px] tracking-[0.3em] uppercase border border-cyan-200/30 px-5 py-2.5 text-cyan-100 hover:bg-cyan-200/10 hover:border-cyan-200/60 transition-colors"
            >
              ← Return to Forest
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
};

export default Propworld;
