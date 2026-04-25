import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Cylinder, Cone, Torus } from "@react-three/drei";
import * as THREE from "three";

interface Props {
  onEnter: () => void;
  onHoverChange?: (hovered: boolean) => void;
}

/**
 * Massive, gnarled, ancient tree at the center of the scene.
 * Built from a tapered trunk + irregular root buttresses + twisted
 * branches + multi-layer canopy. The hollow entrance pulses with a
 * warm amber/gold animated emissive material.
 */
export default function AncientTree({ onEnter, onHoverChange }: Props) {
  const portalGlowRef = useRef<THREE.MeshStandardMaterial>(null);
  const portalRingRef = useRef<THREE.Mesh>(null);
  const portalHaloRef = useRef<THREE.Mesh>(null);
  const arcaneRingRef = useRef<THREE.Mesh>(null);
  const portalLightRef = useRef<THREE.PointLight>(null);

  // Generate gnarled root buttresses & twisted branches deterministically
  const roots = useMemo(() => {
    const arr: { pos: [number, number, number]; rot: [number, number, number]; scale: number }[] = [];
    const count = 9;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + Math.sin(i) * 0.3;
      const r = 2.6;
      arr.push({
        pos: [Math.cos(a) * r, 0.6, Math.sin(a) * r],
        rot: [Math.PI / 2 - 0.3 + Math.sin(i) * 0.15, 0, -a + Math.PI / 2],
        scale: 0.85 + ((Math.sin(i * 7.3) + 1) / 2) * 0.5,
      });
    }
    return arr;
  }, []);

  const branches = useMemo(() => {
    const arr: { pos: [number, number, number]; rot: [number, number, number]; len: number }[] = [];
    const count = 7;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + i * 0.4;
      const y = 9 + (i % 3) * 1.4;
      const tilt = 0.6 + Math.sin(i * 2.1) * 0.25;
      arr.push({
        pos: [Math.cos(a) * 1.6, y, Math.sin(a) * 1.6],
        rot: [Math.sin(i) * 0.3, -a + Math.PI / 2, tilt],
        len: 3.2 + Math.sin(i * 3.7) * 0.9,
      });
    }
    return arr;
  }, []);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    // Warm slow pulse: combine slow + fast wave for organic feel
    const slow = 0.5 + Math.sin(t * 0.9) * 0.5;
    const fast = 0.5 + Math.sin(t * 2.4 + 1.2) * 0.5;
    const pulse = slow * 0.7 + fast * 0.3;

    if (portalGlowRef.current) {
      portalGlowRef.current.emissiveIntensity = 1.6 + pulse * 2.4;
    }
    if (portalRingRef.current) {
      const mat = portalRingRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.55 + pulse * 0.35;
    }
    if (portalHaloRef.current) {
      const mat = portalHaloRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.18 + pulse * 0.22;
      const s = 1 + pulse * 0.1;
      portalHaloRef.current.scale.set(s, s, s);
    }
    if (arcaneRingRef.current) {
      arcaneRingRef.current.rotation.z = t * 0.35;
    }
    if (portalLightRef.current) {
      portalLightRef.current.intensity = 2.5 + pulse * 3.5;
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {/* ---------- Root buttresses (gnarled base) ---------- */}
      {roots.map((r, i) => (
        <Cone key={`root-${i}`} args={[0.55 * r.scale, 2.4 * r.scale, 6]} position={r.pos} rotation={r.rot}>
          <meshStandardMaterial color="#0d0805" roughness={1} />
        </Cone>
      ))}

      {/* ---------- Trunk (tapered, layered for bark detail) ---------- */}
      <Cylinder args={[2.2, 3.4, 14, 18]} position={[0, 7, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#150d09" roughness={0.98} />
      </Cylinder>
      {/* Bark ridges */}
      {[2.5, 5, 8.5, 11].map((y, i) => (
        <Cylinder
          key={`ridge-${i}`}
          args={[2.55 - i * 0.1, 2.55 - i * 0.1, 0.18, 18]}
          position={[0, y, 0]}
        >
          <meshStandardMaterial color="#080503" roughness={1} />
        </Cylinder>
      ))}
      {/* Knots / burls */}
      <mesh position={[2.1, 5.5, 0.6]}>
        <sphereGeometry args={[0.6, 12, 12]} />
        <meshStandardMaterial color="#0a0604" roughness={1} />
      </mesh>
      <mesh position={[-1.9, 8.2, -0.8]}>
        <sphereGeometry args={[0.5, 12, 12]} />
        <meshStandardMaterial color="#0a0604" roughness={1} />
      </mesh>
      <mesh position={[1.6, 10.5, -1.2]}>
        <sphereGeometry args={[0.4, 12, 12]} />
        <meshStandardMaterial color="#0a0604" roughness={1} />
      </mesh>

      {/* ---------- Twisted branches reaching out ---------- */}
      {branches.map((b, i) => (
        <Cylinder
          key={`branch-${i}`}
          args={[0.12, 0.28, b.len, 8]}
          position={b.pos}
          rotation={b.rot}
          castShadow
        >
          <meshStandardMaterial color="#0a0604" roughness={1} />
        </Cylinder>
      ))}

      {/* ---------- Multi-layer canopy ---------- */}
      <Cone args={[7, 8, 14]} position={[0, 17, 0]}>
        <meshStandardMaterial color="#03201a" roughness={0.95} />
      </Cone>
      <Cone args={[5.6, 6, 14]} position={[0, 19, 0]}>
        <meshStandardMaterial color="#062c22" roughness={0.95} />
      </Cone>
      <Cone args={[4.2, 4.6, 14]} position={[0, 21, 0]}>
        <meshStandardMaterial color="#093a2c" roughness={0.95} />
      </Cone>
      <Cone args={[2.6, 3, 12]} position={[0, 23, 0]}>
        <meshStandardMaterial color="#0c4836" roughness={0.95} />
      </Cone>

      {/* ---------- Hollow entrance (interactive) ---------- */}
      <group
        position={[0, 2.8, 3.25]}
        onClick={(e) => {
          e.stopPropagation();
          onEnter();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = "pointer";
          onHoverChange?.(true);
        }}
        onPointerOut={() => {
          document.body.style.cursor = "auto";
          onHoverChange?.(false);
        }}
      >
        {/* Doorway-shaped opening (taller than wide) */}
        <mesh position={[0, 0, 0]}>
          <planeGeometry args={[2.0, 2.8]} />
          <meshBasicMaterial color="#000000" />
        </mesh>

        {/* Glowing emissive arch — the heart of the pulse */}
        <mesh ref={portalRingRef} position={[0, 0, 0.04]}>
          <ringGeometry args={[1.05, 1.55, 48]} />
          <meshStandardMaterial
            ref={portalGlowRef}
            color="#ffb84a"
            emissive="#ff9a2e"
            emissiveIntensity={2.5}
            transparent
            opacity={0.85}
            side={THREE.DoubleSide}
            toneMapped={false}
          />
        </mesh>

        {/* Soft outer halo */}
        <mesh ref={portalHaloRef} position={[0, 0, 0.02]}>
          <circleGeometry args={[2.2, 48]} />
          <meshBasicMaterial
            color="#ffae3a"
            transparent
            opacity={0.25}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>

        {/* Rotating arcane ring */}
        <Torus ref={arcaneRingRef} args={[1.7, 0.03, 8, 64]} position={[0, 0, 0.06]}>
          <meshBasicMaterial
            color="#ffd27a"
            transparent
            opacity={0.7}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </Torus>

        {/* Strong amber point light bleeding out of the hollow */}
        <pointLight
          ref={portalLightRef}
          position={[0, 0, 1.2]}
          intensity={3.5}
          color="#ffa040"
          distance={18}
          decay={2}
        />
      </group>
    </group>
  );
}
