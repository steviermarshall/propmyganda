import { Suspense, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import * as THREE from "three";
import { useIsMobile } from "@/hooks/use-mobile";

import Ground from "./Ground";
import Forest from "./Forest";
import Fireflies from "./Fireflies";
import AncientTree from "./AncientTree";
import TheaterInterior from "./TheaterInterior";
import CameraRig from "./CameraRig";

type Mode = "forest" | "transitioning" | "theater";

interface Props {
  onModeChange?: (mode: Mode) => void;
}

export default function PropworldScene({ onModeChange }: Props) {
  const [mode, setMode] = useState<Mode>("forest");
  const [hovered, setHovered] = useState(false);
  const isMobile = useIsMobile();

  function setModeAndNotify(next: Mode) {
    setMode(next);
    onModeChange?.(next);
  }

  // Pull camera farther back on mobile so the tall tree fits portrait viewports.
  const initialCamZ = isMobile ? 20 : 14;
  const initialCamY = isMobile ? 7 : 5;
  const initialFov = isMobile ? 62 : 55;

  return (
    <Canvas
      shadows={!isMobile}
      camera={{ position: [0, initialCamY, initialCamZ], fov: initialFov }}
      dpr={isMobile ? [1, 1.5] : [1, 2]}
      gl={{
        antialias: !isMobile,
        alpha: false,
        toneMapping: THREE.ACESFilmicToneMapping,
        powerPreference: "high-performance",
      }}
    >
      <color attach="background" args={[mode === "theater" ? "#eaf0ff" : "#04141a"]} />
      {mode !== "theater" && <fog attach="fog" args={["#0a2530", 6, 32]} />}

      {/* Cool moonlit teal/cyan key + warm amber accent */}
      <ambientLight intensity={0.22} color="#3a7a8a" />
      <directionalLight
        position={[3, 18, 2]}
        intensity={1.1}
        color="#bff0ff"
        castShadow={!isMobile}
        shadow-mapSize-width={isMobile ? 512 : 1024}
        shadow-mapSize-height={isMobile ? 512 : 1024}
      />
      <hemisphereLight args={["#5fb3c8", "#06140f", 0.55]} />
      <pointLight position={[-9, 5, -7]} intensity={0.7} color="#1e6bb0" />
      <pointLight position={[9, 4, 6]} intensity={0.5} color="#2a8aa8" />

      <Suspense fallback={null}>
        {mode !== "theater" && (
          <>
            <Ground />
            <Forest />
            <AncientTree
              onEnter={() => setModeAndNotify("transitioning")}
              onHoverChange={setHovered}
              isMobile={isMobile}
            />
            <Fireflies count={isMobile ? 280 : 650} />
          </>
        )}

        {mode === "theater" && <TheaterInterior isMobile={isMobile} />}
      </Suspense>

      <CameraRig
        mode={mode}
        hovered={hovered && mode === "forest"}
        isMobile={isMobile}
        onTransitionComplete={() => setModeAndNotify("theater")}
      />

      <EffectComposer>
        <Bloom
          intensity={mode === "transitioning" ? 2.2 : mode === "theater" ? 1.6 : 1.25}
          luminanceThreshold={mode === "theater" ? 0.15 : 0.18}
          luminanceSmoothing={0.9}
          mipmapBlur
        />
        <Vignette
          eskil={false}
          offset={mode === "theater" ? 0.25 : 0.18}
          darkness={mode === "transitioning" ? 1.0 : mode === "theater" ? 0.9 : 0.88}
        />
      </EffectComposer>
    </Canvas>
  );
}
