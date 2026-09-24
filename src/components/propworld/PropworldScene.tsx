import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Canvas, type ThreeEvent } from "@react-three/fiber";
import { Environment, Html, Lightformer } from "@react-three/drei";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import * as THREE from "three";
import { useIsMobile } from "@/hooks/use-mobile";

import Ground from "./Ground";
import Forest from "./Forest";
import Fireflies from "./Fireflies";
import AncientTree from "./AncientTree";
import CameraRig from "./CameraRig";
import Explorer from "./Explorer";
import ForestExtras from "./ForestExtras";
import { PORTALS, PORTAL_BY_ID, WORLD_RADIUS, player, type Portal } from "./worldState";

interface Props {
  /** Fired when the swoop into a tree finishes. */
  onEnter: (p: Portal) => void;
  onTransitionStart?: (p: Portal) => void;
  onNear?: (p: Portal | null) => void;
}

export default function PropworldScene({ onEnter, onTransitionStart, onNear }: Props) {
  const [mode, setMode] = useState<"forest" | "transitioning">("forest");
  const [target, setTarget] = useState<Portal | null>(null);
  const isMobile = useIsMobile();
  const modeRef = useRef(mode);
  modeRef.current = mode;

  const startEnter = useCallback((p: Portal) => {
    if (modeRef.current !== "forest") return;
    setTarget(p);
    setMode("transitioning");
    onTransitionStart?.(p);
  }, [onTransitionStart]);

  /** Tree clicked from afar: walk there, then enter. */
  const walkToTree = useCallback((p: Portal) => {
    const door = PORTAL_BY_ID[p].door;
    const d = Math.hypot(player.pos.x - door[0], player.pos.z - door[1]);
    if (d < 1.2) return startEnter(p);
    player.target = new THREE.Vector3(door[0], 0, door[1]);
    player.pendingEnter = p;
  }, [startEnter]);

  // DOM prompt button → enter
  useEffect(() => {
    const h = (e: Event) => startEnter((e as CustomEvent<Portal>).detail);
    window.addEventListener("propworld:enter", h);
    return () => window.removeEventListener("propworld:enter", h);
  }, [startEnter]);

  const onGroundClick = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 6 || modeRef.current !== "forest") return;
    const pt = e.point.clone().setY(0);
    const r = Math.hypot(pt.x, pt.z);
    if (r > WORLD_RADIUS) pt.multiplyScalar(WORLD_RADIUS / r);
    player.target = pt;
    player.pendingEnter = null;
  };

  return (
    <Canvas
      shadows={!isMobile}
      camera={{ position: [0, 9, 20], fov: isMobile ? 58 : 50 }}
      dpr={isMobile ? [1, 1.5] : [1, 2]}
      gl={{ antialias: !isMobile, alpha: false, toneMapping: THREE.ACESFilmicToneMapping, powerPreference: "high-performance" }}
    >
      <color attach="background" args={["#04141a"]} />
      <fog attach="fog" args={["#0a2530", 10, 34]} />

      <ambientLight intensity={0.28} color="#3a7a8a" />
      <directionalLight
        position={[6, 18, 8]}
        intensity={1.15}
        color="#bff0ff"
        castShadow={!isMobile}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-16}
        shadow-camera-right={16}
        shadow-camera-top={16}
        shadow-camera-bottom={-16}
        shadow-bias={-0.0005}
      />
      <hemisphereLight args={["#5fb3c8", "#06140f", 0.55]} />

      <Environment resolution={64}>
        <Lightformer intensity={0.9} color="#9fdcff" position={[0, 6, -8]} scale={[18, 5, 1]} />
        <Lightformer intensity={0.5} color="#2f7a8a" position={[-8, 2, 4]} rotation-y={Math.PI / 2} scale={[14, 2, 1]} />
        <Lightformer intensity={0.4} color="#ffb85c" position={[8, 2, 4]} rotation-y={-Math.PI / 2} scale={[10, 2, 1]} />
      </Environment>

      <Suspense fallback={null}>
        <Ground />
        <Forest />
        <ForestExtras isMobile={isMobile} />

        {/* invisible click-to-walk surface */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} onClick={onGroundClick}>
          <circleGeometry args={[WORLD_RADIUS + 3, 48]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>

        {PORTALS.map((p) => (
          <group key={p.id} position={[p.pos[0], 0, p.pos[1]]} scale={0.58}>
            <AncientTree onEnter={() => walkToTree(p.id)} isMobile={isMobile} variant={p.id} />
            {mode === "forest" && (
              <Html position={[0, 17, 0]} center distanceFactor={isMobile ? 26 : 20} style={{ pointerEvents: "none" }}>
                <div className="whitespace-nowrap text-center select-none">
                  <p className="text-[10px] uppercase tracking-[0.4em]" style={{ color: p.color, opacity: 0.8 }}>{p.sub.split(" · ")[0]}</p>
                  <p className="font-display text-4xl uppercase" style={{ color: "#f4f1e8", textShadow: `0 0 18px ${p.color}` }}>{p.label}</p>
                </div>
              </Html>
            )}
          </group>
        ))}

        {mode === "forest" && <Explorer onNear={(p) => onNear?.(p)} onEnter={startEnter} />}
        <Fireflies count={isMobile ? 240 : 520} />
      </Suspense>

      <CameraRig mode={mode} target={target} isMobile={isMobile} onTransitionComplete={() => target && onEnter(target)} />

      <EffectComposer key={isMobile ? "m" : "d"}>
        <Bloom intensity={mode === "transitioning" ? 2.2 : 1.2} luminanceThreshold={0.2} luminanceSmoothing={0.9} mipmapBlur />
        <Vignette eskil={false} offset={0.2} darkness={mode === "transitioning" ? 1 : 0.8} />
      </EffectComposer>
    </Canvas>
  );
}
