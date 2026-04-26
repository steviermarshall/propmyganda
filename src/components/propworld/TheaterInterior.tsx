import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Cylinder, Html } from "@react-three/drei";
import * as THREE from "three";

/**
 * Mystical movie theater inside the ancient tree:
 *  - Curved wooden walls (open cylinder) with deep bark tone
 *  - Bioluminescent moss patches that breathe (animated emissive)
 *  - A large curved screen on the front wall
 *  - Interactive Discord widget rendered via drei <Html transform>
 *  - Per-frame pulse on the screen frame to feed the global Bloom pass
 */
interface TheaterProps {
  isMobile?: boolean;
}

export default function TheaterInterior({ isMobile = false }: TheaterProps) {
  const mossRefs = useRef<THREE.MeshStandardMaterial[]>([]);
  const screenGlowRef = useRef<THREE.MeshBasicMaterial>(null);
  const screenFrameRef = useRef<THREE.MeshStandardMaterial>(null);

  // Deterministic moss patch placements scattered along the curved wall.
  const mossPatches = useMemo(() => {
    const arr: {
      pos: [number, number, number];
      rot: [number, number, number];
      scale: [number, number];
      seed: number;
      hue: "teal" | "cyan" | "mint";
    }[] = [];
    const count = 22;
    const rng = (n: number) => {
      const x = Math.sin(n * 9173.13) * 43758.5453;
      return x - Math.floor(x);
    };
    for (let i = 0; i < count; i++) {
      // Spread across the visible (back) half of the cylinder
      const a = -Math.PI * 0.7 + rng(i) * Math.PI * 1.4;
      const r = 7.85; // just inside wall radius (8) so it sits on the surface
      const x = Math.sin(a) * r;
      const z = -Math.cos(a) * r + 2;
      const y = 0.6 + rng(i + 50) * 5.2;
      const w = 0.35 + rng(i + 100) * 0.6;
      const h = 0.25 + rng(i + 200) * 0.45;
      const hueRoll = rng(i + 300);
      arr.push({
        pos: [x, y, z],
        rot: [0, a + Math.PI, 0], // face inward toward center
        scale: [w, h],
        seed: rng(i + 400) * Math.PI * 2,
        hue: hueRoll < 0.4 ? "teal" : hueRoll < 0.75 ? "cyan" : "mint",
      });
    }
    return arr;
  }, []);

  const mossColor = (hue: "teal" | "cyan" | "mint") =>
    hue === "teal" ? "#3affc4" : hue === "cyan" ? "#5bd9ff" : "#aaffd6";

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    mossRefs.current.forEach((mat, i) => {
      if (!mat) return;
      const seed = mossPatches[i]?.seed ?? 0;
      const pulse = 0.5 + Math.sin(t * 0.7 + seed) * 0.5;
      mat.emissiveIntensity = 1.2 + pulse * 1.8;
    });
    if (screenGlowRef.current) {
      const pulse = 0.5 + Math.sin(t * 0.6) * 0.5;
      screenGlowRef.current.opacity = 0.18 + pulse * 0.12;
    }
    if (screenFrameRef.current) {
      const pulse = 0.5 + Math.sin(t * 0.6) * 0.5;
      screenFrameRef.current.emissiveIntensity = 0.6 + pulse * 0.8;
    }
  });

  return (
    <group>
      {/* ---------- Floor ---------- */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
        <circleGeometry args={[10, 64]} />
        <meshStandardMaterial color="#1a0e08" roughness={0.92} />
      </mesh>
      {/* Subtle floor glow ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.49, 0]}>
        <ringGeometry args={[7, 9.5, 64]} />
        <meshBasicMaterial
          color="#ffaa55"
          transparent
          opacity={0.06}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* ---------- Curved wooden back wall ---------- */}
      <Cylinder
        args={[8, 8, 7, 64, 1, true, -Math.PI * 0.7, Math.PI * 1.4]}
        position={[0, 3, 2]}
      >
        <meshStandardMaterial
          color="#2a160c"
          roughness={0.88}
          metalness={0.08}
          side={THREE.DoubleSide}
        />
      </Cylinder>

      {/* Inner darker shadow ring at the bottom of the wall */}
      <Cylinder
        args={[7.95, 7.95, 1.2, 64, 1, true, -Math.PI * 0.7, Math.PI * 1.4]}
        position={[0, 0.1, 2]}
      >
        <meshStandardMaterial color="#0e0703" roughness={1} side={THREE.DoubleSide} />
      </Cylinder>

      {/* Ceiling cap */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 6.5, 2]}>
        <circleGeometry args={[8.2, 64]} />
        <meshStandardMaterial color="#170c06" roughness={0.95} side={THREE.DoubleSide} />
      </mesh>

      {/* ---------- Bioluminescent moss patches ---------- */}
      {mossPatches.map((p, i) => (
        <mesh key={`moss-${i}`} position={p.pos} rotation={p.rot}>
          <planeGeometry args={[p.scale[0], p.scale[1]]} />
          <meshStandardMaterial
            ref={(el) => {
              if (el) mossRefs.current[i] = el;
            }}
            color={mossColor(p.hue)}
            emissive={mossColor(p.hue)}
            emissiveIntensity={1.5}
            roughness={0.9}
            transparent
            opacity={0.95}
            toneMapped={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}

      {/* ---------- Curved screen ---------- */}
      {/* Curved frame: a thin cylinder slice behind the screen */}
      <Cylinder
        args={[6.2, 6.2, 5.6, 48, 1, true, Math.PI - 0.45, 0.9]}
        position={[0, 3, 1.2]}
      >
        <meshStandardMaterial
          ref={screenFrameRef}
          color="#3b2415"
          emissive="#ffb060"
          emissiveIntensity={0.8}
          roughness={0.5}
          metalness={0.35}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </Cylinder>

      {/* Soft additive glow disc behind the screen — feeds Bloom */}
      <mesh position={[0, 3, -5.55]}>
        <planeGeometry args={[10.5, 6.8]} />
        <meshBasicMaterial
          ref={screenGlowRef}
          color="#ffc870"
          transparent
          opacity={0.22}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {/* The interactive Discord widget — sits inside the curved frame */}
      <Html
        position={[0, 3, -5.35]}
        transform
        occlude={false}
        distanceFactor={4.2}
        style={{
          width: "780px",
          height: "460px",
          borderRadius: "10px",
          overflow: "hidden",
          boxShadow:
            "0 0 120px rgba(255, 180, 80, 0.45), 0 0 40px rgba(122, 252, 209, 0.25) inset",
        }}
      >
        <iframe
          title="Propworld Discord"
          src="https://discord.com/widget?id=1011591077406572574&theme=dark"
          width="780"
          height="460"
          frameBorder="0"
          sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
          style={{ border: 0, display: "block", background: "#1a1a1a" }}
        />
      </Html>

      {/* Top accent rim light along the upper edge of the wall */}
      <mesh rotation={[0, 0, 0]} position={[0, 6.2, 2]}>
        <torusGeometry args={[7.95, 0.04, 8, 96, Math.PI * 1.4]} />
        <meshBasicMaterial
          color="#7afcd1"
          transparent
          opacity={0.55}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>

      {/* ---------- Lighting ---------- */}
      <pointLight position={[0, 4, -3]} intensity={1.4} color="#ffc870" distance={22} />
      <pointLight position={[-5, 2, 1]} intensity={0.55} color="#7afcd1" distance={14} />
      <pointLight position={[5, 2, 1]} intensity={0.55} color="#7afcd1" distance={14} />
      <pointLight position={[0, 0.2, 4]} intensity={0.35} color="#ffaa55" distance={10} />
      <ambientLight intensity={0.22} color="#3a2a1a" />
    </group>
  );
}
