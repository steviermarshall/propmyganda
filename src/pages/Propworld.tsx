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
  const [hud, setHud] = useState<HudState>({ score: 0, hp: 10, wave: 1, gameOver: false, waveComplete: false });
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

  const maxHp = 10;
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
              className={`h-3 w-3 rounded-sm border transition-all duration-300 ${
                alive
                  ? "bg-cyan-400 border-cyan-300 shadow-[0_0_5px_rgba(0,255,238,0.8)]"
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
  const [selectedSide, setSelectedSide] = useState<"room" | "game" | null>(null);
  const [requestEnter, setRequestEnter] = useState<"theater" | "game" | null>(null);

  const handleModeChange = (m: Mode) => {
    setMode(m);
    if (m === "transitioning") setRequestEnter(null);
  };

  const selectSide = (side: "room" | "game") => {
    setSelectedSide((prev) => (prev === side ? null : side));
  };

  const enter = () => {
    if (!selectedSide) return;
    setRequestEnter(selectedSide === "room" ? "theater" : "game");
  };

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-[#02060a] text-white">
      {/* Full-screen 3D scene */}
      <div className="absolute inset-0">
        <Suspense fallback={<div className="w-full h-full bg-[#02060a]" />}>
          <PropworldScene
            onModeChange={handleModeChange}
            externalHoverSide={mode === "forest" ? selectedSide : null}
            requestEnter={requestEnter}
          />
        </Suspense>
      </div>

      {/* Subtle vignette overlay for legibility */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />

      {/* Cosmic HUD overlay — theater and game */}
      {(mode === "theater" || mode === "game") && <CosmicHUD />}

      {/* Game HUD — score, HP, wave */}
      {mode === "game" && <GameHUD />}

      {/* ── Forest pill-choice UI ───────────────────────────── */}
      <AnimatePresence>
        {mode === "forest" && (
          <motion.div
            key="forest-ui"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="absolute inset-0 pointer-events-none"
          >
            {/* Left half — THE GAME (blue pill) */}
            <motion.button
              animate={{ opacity: selectedSide === "room" ? 0.35 : 1 }}
              transition={{ duration: 0.4 }}
              className="pointer-events-auto absolute left-0 top-0 h-full w-1/2 flex flex-col items-start justify-end pb-16 pl-8 md:pl-12 text-left"
              style={{ background: selectedSide === "game" ? "linear-gradient(to right, rgba(0,180,255,0.07), transparent)" : "transparent" }}
              onClick={() => selectSide("game")}
            >
              <p className="text-[9px] tracking-[0.45em] uppercase text-cyan-400/60 mb-2">
                Blue Tree
              </p>
              <h2 className={`text-3xl md:text-4xl font-bold uppercase tracking-tight transition-colors duration-300 ${selectedSide === "game" ? "text-cyan-200" : "text-cyan-100/70"}`}>
                The Game
              </h2>
              <p className="mt-1 text-[11px] md:text-xs text-cyan-300/50 tracking-wide">
                Space combat · Wave survival
              </p>
              {selectedSide === "game" && (
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.3 }}
                  className="mt-3 h-px w-24 bg-cyan-400/60 origin-left"
                />
              )}
            </motion.button>

            {/* Right half — THE ROOM (amber pill) */}
            <motion.button
              animate={{ opacity: selectedSide === "game" ? 0.35 : 1 }}
              transition={{ duration: 0.4 }}
              className="pointer-events-auto absolute right-0 top-0 h-full w-1/2 flex flex-col items-end justify-end pb-16 pr-8 md:pr-12 text-right"
              style={{ background: selectedSide === "room" ? "linear-gradient(to left, rgba(255,180,30,0.07), transparent)" : "transparent" }}
              onClick={() => selectSide("room")}
            >
              <p className="text-[9px] tracking-[0.45em] uppercase text-amber-400/60 mb-2">
                Amber Tree
              </p>
              <h2 className={`text-3xl md:text-4xl font-bold uppercase tracking-tight transition-colors duration-300 ${selectedSide === "room" ? "text-amber-200" : "text-amber-100/70"}`}>
                The Room
              </h2>
              <p className="mt-1 text-[11px] md:text-xs text-amber-300/50 tracking-wide">
                Social hub · Media wall
              </p>
              {selectedSide === "room" && (
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.3 }}
                  className="mt-3 h-px w-24 bg-amber-400/60 origin-right"
                />
              )}
            </motion.button>

            {/* Center divider + title */}
            <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-col items-center pt-10">
              <p className="text-[9px] tracking-[0.5em] uppercase text-white/30 mb-2">Propworld</p>
              <div className="h-px w-8 bg-white/15" />
            </div>

            {/* Center enter button — appears when a side is chosen */}
            <AnimatePresence>
              {selectedSide && (
                <motion.div
                  key="enter-btn"
                  initial={{ opacity: 0, y: 12, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.92 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  className="pointer-events-auto absolute left-1/2 bottom-10 -translate-x-1/2 flex flex-col items-center gap-3"
                >
                  <button
                    onClick={enter}
                    className={`px-10 py-3 text-[11px] tracking-[0.4em] uppercase font-medium border transition-all duration-200 ${
                      selectedSide === "game"
                        ? "border-cyan-400/60 text-cyan-100 hover:bg-cyan-400/15 hover:border-cyan-300"
                        : "border-amber-400/60 text-amber-100 hover:bg-amber-400/15 hover:border-amber-300"
                    }`}
                  >
                    Enter →
                  </button>
                  <p className="text-[9px] tracking-[0.3em] uppercase text-white/25">
                    Tap the other side to switch
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Initial hint — fades when a side is selected */}
            <AnimatePresence>
              {!selectedSide && (
                <motion.p
                  key="hint"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4 }}
                  className="pointer-events-none absolute inset-x-0 bottom-8 text-center text-[9px] tracking-[0.35em] uppercase text-white/30"
                >
                  Choose a side · Drag to look around
                </motion.p>
              )}
            </AnimatePresence>
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
              Drag to aim · Tap / Space / Hold to fire
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
