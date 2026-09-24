import { Suspense, lazy, useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import PMGFight3D from "@/components/PMGFight3D";
import SEO from "@/components/SEO";
import { useIsMobile } from "@/hooks/use-mobile";
import { Joystick, Minimap, SoundToggle } from "@/components/propworld/ForestUI";
import { PORTAL_BY_ID, placePlayerAtDoor, type Portal } from "@/components/propworld/worldState";

const PropworldScene = lazy(() => import("@/components/propworld/PropworldScene"));
const SpaceGameOverlay = lazy(() => import("@/components/propworld/SpaceGameOverlay"));
const RoomExclusive = lazy(() => import("@/components/propworld/RoomExclusive"));

type Mode = "forest" | "transitioning" | Portal;

const Propworld = () => {
  const [mode, setMode] = useState<Mode>("forest");
  const [near, setNear] = useState<Portal | null>(null);
  const isMobile = useIsMobile();
  const pending = useRef<Portal | null>(null);

  // Failsafe: on slow devices the camera swoop can lag — open the tree anyway.
  useEffect(() => {
    if (mode !== "transitioning") return;
    const t = setTimeout(() => { if (pending.current) setMode(pending.current); }, 2600);
    return () => clearTimeout(t);
  }, [mode]);

  const exitTo = useCallback((from: Portal) => {
    placePlayerAtDoor(from);
    setNear(null);
    setMode("forest");
  }, []);

  const inForest = mode === "forest" || mode === "transitioning";
  const nearSpec = near ? PORTAL_BY_ID[near] : null;

  return (
    <main className="relative h-screen w-screen select-none overflow-hidden bg-[#02060a] text-white" style={{ WebkitUserSelect: "none", WebkitTouchCallout: "none" } as React.CSSProperties}>
      <SEO
        title="Propworld — Interactive 3D Experience | PMG"
        description="Explore Propworld, PMG's interactive 3D forest: play The Game, battle in PMG Fight, and step into the PMG Exclusive room."
        path="/propworld"
      />
      <h1 className="sr-only">Propworld — PMG interactive 3D experience</h1>

      {/* Explorable forest — unmounted while inside a tree to free the GPU */}
      {inForest && (
        <div className="absolute inset-0">
          <Suspense fallback={<div className="h-full w-full bg-[#02060a]" />}>
            <PropworldScene
              onNear={setNear}
              onTransitionStart={(p) => { pending.current = p; setMode("transitioning"); }}
              onEnter={(p) => setMode(p)}
            />
          </Suspense>
        </div>
      )}

      {inForest && <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/50" />}

      {/* Forest HUD */}
      <AnimatePresence>
        {mode === "forest" && (
          <motion.div key="forest-ui" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }} className="pointer-events-none absolute inset-0">
            <div className="absolute right-4 top-20 flex flex-col items-end gap-3">
              <Minimap />
              <SoundToggle />
            </div>

            <div className="absolute inset-x-0 top-20 flex flex-col items-center">
              <p className="text-[9px] uppercase tracking-[0.5em] text-white/40">Propworld</p>
              <div className="mt-2 h-px w-8 bg-white/20" />
            </div>

            <AnimatePresence>
              {nearSpec && (
                <motion.button
                  key={nearSpec.id}
                  initial={{ opacity: 0, y: 16, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10 }}
                  onClick={() => window.dispatchEvent(new CustomEvent("propworld:enter", { detail: nearSpec.id }))}
                  className="pointer-events-auto absolute bottom-28 left-1/2 -translate-x-1/2 border bg-black/55 px-7 py-3 text-center backdrop-blur"
                  style={{ borderColor: nearSpec.color, boxShadow: `0 0 30px ${nearSpec.color}55` }}
                >
                  <span className="block text-[9px] uppercase tracking-[0.4em]" style={{ color: nearSpec.color }}>{nearSpec.sub}</span>
                  <span className="mt-1 block font-display text-2xl uppercase text-white">Enter {nearSpec.label}</span>
                  <span className="mt-1 block text-[9px] uppercase tracking-[0.3em] text-white/50">{isMobile ? "Tap" : "Press E"}</span>
                </motion.button>
              )}
            </AnimatePresence>

            {isMobile && <Joystick />}

            <p className="absolute inset-x-0 bottom-6 px-6 text-center text-[9px] uppercase tracking-[0.3em] text-white/40">
              {isMobile ? "Joystick or tap to walk · Drag to turn · Tap a tree to enter" : "WASD / click to walk · Drag or Q/R to turn · Scroll to zoom · E to enter"}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fade to black while swooping into a tree */}
      <AnimatePresence>
        {mode === "transitioning" && (
          <motion.div
            key="trans-fade"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0, 1] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.6, times: [0, 0.55, 1], ease: "easeIn" }}
            className="pointer-events-none absolute inset-0 bg-black"
          />
        )}
      </AnimatePresence>

      {/* Tree interiors — full-screen, like PMG Fight */}
      <AnimatePresence>
        {mode === "fight" && (
          <motion.div key="fight" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.45 }} className="absolute inset-0 z-[60] overflow-auto bg-background">
            <PMGFight3D onExit={() => exitTo("fight")} />
          </motion.div>
        )}
        {mode === "game" && (
          <motion.div key="game" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.45 }} className="absolute inset-0 z-[40]">
            <Suspense fallback={<div className="h-full w-full bg-[#02030a]" />}>
              <SpaceGameOverlay onExit={() => exitTo("game")} />
            </Suspense>
          </motion.div>
        )}
        {mode === "room" && (
          <motion.div key="room" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.45 }} className="absolute inset-0 z-[40]">
            <Suspense fallback={<div className="h-full w-full bg-[#0e0804]" />}>
              <RoomExclusive onExit={() => exitTo("room")} />
            </Suspense>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
};

export default Propworld;
