import { Suspense, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import * as THREE from "three";

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

  function setModeAndNotify(next: Mode) {
    setMode(next);
    onModeChange?.(next);
  }

  return (
    <Canvas
      shadows
      camera={{ position: [0, 5, 14], fov: 55 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: false, toneMapping: THREE.ACESFilmicToneMapping }}
    >
      <color attach="background" args={["#02060a"]} />
      <fog attach="fog" args={["#03100f", 8, 28]} />

      {/* Ambient enchanted lighting */}
      <ambientLight intensity={0.18} color="#5a8fa0" />
      <directionalLight
        position={[6, 14, 4]}
        intensity={0.7}
        color="#cdeed0"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <pointLight position={[-8, 4, -6]} intensity={0.5} color="#1e5fb0" />

      <Suspense fallback={null}>
        {mode !== "theater" && (
          <>
            <Ground />
            <Forest />
            <AncientTree
              onEnter={() => setModeAndNotify("transitioning")}
              onHoverChange={setHovered}
            />
            <Fireflies count={650} />
          </>
        )}

        {mode === "theater" && <TheaterInterior />}
      </Suspense>

      <CameraRig
        mode={mode}
        hovered={hovered && mode === "forest"}
        onTransitionComplete={() => setModeAndNotify("theater")}
      />

      <EffectComposer>
        <Bloom
          intensity={mode === "transitioning" ? 2.2 : mode === "theater" ? 1.6 : 1.1}
          luminanceThreshold={mode === "theater" ? 0.15 : 0.2}
          luminanceSmoothing={0.9}
          mipmapBlur
        />
        <Vignette
          eskil={false}
          offset={mode === "theater" ? 0.25 : 0.15}
          darkness={mode === "transitioning" ? 1.0 : mode === "theater" ? 0.9 : 0.85}
        />
      </EffectComposer>
    </Canvas>
  );
}
