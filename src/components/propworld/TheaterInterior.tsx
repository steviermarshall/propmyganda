import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Cylinder, Html } from "@react-three/drei";
import * as THREE from "three";

/**
 * Magical movie theater with curved wooden walls, bioluminescent
 * accents, and an embedded Discord widget on the screen.
 */
export default function TheaterInterior() {
  const accentRefs = useRef<THREE.Mesh[]>([]);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    accentRefs.current.forEach((m, i) => {
      if (!m) return;
      const mat = m.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.5 + Math.sin(t * 0.8 + i * 0.7) * 0.35;
    });
  });

  // Bioluminescent accent strips placed around the curved wall
  const accentCount = 14;
  const accents = Array.from({ length: accentCount }).map((_, i) => {
    const a = (i / accentCount) * Math.PI * 1.4 - Math.PI * 0.7;
    const r = 7.2;
    const x = Math.sin(a) * r;
    const z = -Math.cos(a) * r + 2;
    return { pos: [x, 1.2 + (i % 3) * 0.6, z] as [number, number, number], rot: a };
  });

  return (
    <group>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
        <circleGeometry args={[10, 64]} />
        <meshStandardMaterial color="#1a0e08" roughness={0.9} />
      </mesh>

      {/* Curved wooden back wall (open cylinder) */}
      <Cylinder
        args={[8, 8, 7, 64, 1, true, -Math.PI * 0.7, Math.PI * 1.4]}
        position={[0, 3, 2]}
      >
        <meshStandardMaterial
          color="#2a160c"
          roughness={0.85}
          side={THREE.DoubleSide}
          metalness={0.1}
        />
      </Cylinder>

      {/* Ceiling cap */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 6.5, 2]}>
        <circleGeometry args={[8.2, 64]} />
        <meshStandardMaterial color="#170c06" roughness={0.95} side={THREE.DoubleSide} />
      </mesh>

      {/* Bioluminescent accent strips */}
      {accents.map((a, i) => (
        <mesh
          key={i}
          ref={(el) => {
            if (el) accentRefs.current[i] = el;
          }}
          position={a.pos}
          rotation={[0, a.rot, 0]}
        >
          <planeGeometry args={[0.08, 1.4]} />
          <meshBasicMaterial
            color="#7afcd1"
            transparent
            opacity={0.7}
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}

      {/* Theater screen frame */}
      <mesh position={[0, 3, -5.4]}>
        <planeGeometry args={[8.6, 5.2]} />
        <meshStandardMaterial color="#3b2415" roughness={0.6} metalness={0.3} />
      </mesh>

      {/* Glowing screen border */}
      <mesh position={[0, 3, -5.39]}>
        <planeGeometry args={[8.2, 4.8]} />
        <meshBasicMaterial color="#ffc870" transparent opacity={0.18} blending={THREE.AdditiveBlending} />
      </mesh>

      {/* The actual screen — Discord widget via <Html> */}
      <Html
        position={[0, 3, -5.35]}
        transform
        occlude={false}
        distanceFactor={4.2}
        style={{
          width: "780px",
          height: "460px",
          borderRadius: "8px",
          overflow: "hidden",
          boxShadow: "0 0 80px rgba(255, 180, 80, 0.35)",
        }}
      >
        <iframe
          title="Propworld Discord"
          src="https://discord.com/widget?id=1011591077406572574&theme=dark"
          width="780"
          height="460"
          frameBorder="0"
          sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
          style={{ border: 0, display: "block" }}
        />
      </Html>

      {/* Accent lights */}
      <pointLight position={[0, 4, -3]} intensity={1.2} color="#ffc870" distance={20} />
      <pointLight position={[-5, 2, 1]} intensity={0.6} color="#7afcd1" distance={12} />
      <pointLight position={[5, 2, 1]} intensity={0.6} color="#7afcd1" distance={12} />
      <ambientLight intensity={0.25} color="#3a2a1a" />
    </group>
  );
}
