import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Cylinder, Cone, Torus } from "@react-three/drei";
import * as THREE from "three";

interface Props {
  onEnter: () => void;
}

/**
 * Massive ancient tree at the center of the forest with a glowing
 * hollow entrance that pulses gold and is clickable.
 */
export default function AncientTree({ onEnter }: Props) {
  const portalRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    const pulse = 0.5 + Math.sin(t * 1.4) * 0.5;

    if (portalRef.current) {
      const mat = portalRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.55 + pulse * 0.35;
    }
    if (glowRef.current) {
      const mat = glowRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.18 + pulse * 0.22;
      const s = 1 + pulse * 0.08;
      glowRef.current.scale.set(s, s, s);
    }
    if (ringRef.current) {
      ringRef.current.rotation.z = t * 0.3;
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {/* Massive trunk */}
      <Cylinder args={[2.4, 3.2, 14, 16]} position={[0, 7, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#150d09" roughness={0.95} />
      </Cylinder>

      {/* Bark detail rings */}
      <Cylinder args={[2.55, 2.55, 0.15, 16]} position={[0, 4, 0]}>
        <meshStandardMaterial color="#0a0605" roughness={1} />
      </Cylinder>
      <Cylinder args={[2.45, 2.45, 0.15, 16]} position={[0, 6, 0]}>
        <meshStandardMaterial color="#0a0605" roughness={1} />
      </Cylinder>

      {/* Canopy — layered cones */}
      <Cone args={[6, 7, 12]} position={[0, 16, 0]}>
        <meshStandardMaterial color="#04231a" roughness={0.95} />
      </Cone>
      <Cone args={[5, 5.5, 12]} position={[0, 18, 0]}>
        <meshStandardMaterial color="#072d22" roughness={0.95} />
      </Cone>
      <Cone args={[3.8, 4, 12]} position={[0, 20, 0]}>
        <meshStandardMaterial color="#0a3a2c" roughness={0.95} />
      </Cone>

      {/* Hollow entrance (clickable) */}
      <group
        position={[0, 2.5, 3.05]}
        onClick={(e) => {
          e.stopPropagation();
          onEnter();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          document.body.style.cursor = "auto";
        }}
      >
        {/* Entrance opening (dark void) */}
        <mesh position={[0, 0, 0]}>
          <circleGeometry args={[1.1, 32]} />
          <meshBasicMaterial color="#000000" />
        </mesh>

        {/* Pulsing gold portal glow */}
        <mesh ref={portalRef} position={[0, 0, 0.02]}>
          <ringGeometry args={[0.6, 1.15, 48]} />
          <meshBasicMaterial
            color="#ffb84a"
            transparent
            opacity={0.7}
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Outer halo */}
        <mesh ref={glowRef} position={[0, 0, 0.01]}>
          <circleGeometry args={[1.6, 48]} />
          <meshBasicMaterial
            color="#ffae3a"
            transparent
            opacity={0.25}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>

        {/* Rotating arcane ring */}
        <Torus ref={ringRef} args={[1.3, 0.025, 8, 64]} position={[0, 0, 0.05]}>
          <meshBasicMaterial
            color="#ffd27a"
            transparent
            opacity={0.7}
            blending={THREE.AdditiveBlending}
          />
        </Torus>

        {/* Strong point light at entrance */}
        <pointLight position={[0, 0, 1]} intensity={3.5} color="#ffaa44" distance={14} decay={2} />
      </group>
    </group>
  );
}
