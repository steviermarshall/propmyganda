import { Suspense, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import { Cone } from "@react-three/drei";
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

/* ---------- Volumetric-style god ray (additive cone) ---------- */
function GodRay({
  position,
  rotation = [0, 0, 0],
  height = 22,
  radius = 1.6,
  color = "#9ee6ff",
  opacity = 0.09,
  seed = 0,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  height?: number;
  radius?: number;
  color?: string;
  opacity?: number;
  seed?: number;
}) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.getElapsedTime();
    const mat = ref.current.material as THREE.MeshBasicMaterial;
    mat.opacity = opacity + Math.sin(t * 0.5 + seed) * 0.025;
  });
  return (
    <Cone ref={ref} args={[radius, height, 24, 1, true]} position={position} rotation={rotation}>
      <meshBasicMaterial
        color={color}
        transparent
        opacity={opacity}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        side={THREE.DoubleSide}
        toneMapped={false}
      />
    </Cone>
  );
}

function GodRays() {
  const rays: Array<{
    position: [number, number, number];
    rotation: [number, number, number];
    radius: number;
    height: number;
    opacity: number;
    color: string;
  }> = [
    // Strong central column straight down through the canopy
    { position: [0, 11, -2], rotation: [0, 0, 0], radius: 2.6, height: 24, opacity: 0.18, color: "#bff0ff" },
    // Slanted side beams
    { position: [-5, 11, -1], rotation: [0.05, 0, 0.18], radius: 1.6, height: 22, opacity: 0.12, color: "#a8e4ff" },
    { position: [4.5, 11, 0], rotation: [-0.05, 0, -0.16], radius: 1.4, height: 22, opacity: 0.11, color: "#a8e4ff" },
    { position: [7, 11, 3], rotation: [0, 0, -0.22], radius: 1.1, height: 20, opacity: 0.09, color: "#9eddf5" },
    { position: [-7, 11, 4], rotation: [0, 0, 0.22], radius: 1.1, height: 20, opacity: 0.09, color: "#9eddf5" },
    { position: [0, 11, 6], rotation: [-0.08, 0, 0], radius: 1.2, height: 21, opacity: 0.10, color: "#bff0ff" },
  ];
  return (
    <>
      {rays.map((r, i) => (
        <GodRay key={i} {...r} seed={i * 1.7} />
      ))}
    </>
  );
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
      <color attach="background" args={["#04141a"]} />
      <fog attach="fog" args={["#0a2530", 6, 32]} />

      {/* Cool moonlit teal/cyan key + warm amber accent */}
      <ambientLight intensity={0.22} color="#3a7a8a" />
      <directionalLight
        position={[3, 18, 2]}
        intensity={1.1}
        color="#bff0ff"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
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
