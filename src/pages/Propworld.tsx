import { Suspense, lazy, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const PropworldScene = lazy(() => import("@/components/propworld/PropworldScene"));

type Mode = "forest" | "transitioning" | "theater";

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
              Enter the
              <span className="block bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200 bg-clip-text text-transparent">
                Ancient Tree
              </span>
            </h1>
            <p className="mt-4 max-w-md text-sm md:text-base text-white/60">
              Tap the glowing hollow to step inside.
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

      {/* Theater UI */}
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
              The Inner Sanctum · Slow drag to look · Tap props to kick
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
    </main>
  );
};

export default Propworld;
