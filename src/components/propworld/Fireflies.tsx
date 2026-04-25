import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Points, PointMaterial, Float } from "@react-three/drei";
import * as THREE from "three";

export default function Fireflies({ count = 600 }: { count?: number }) {
  const pointsRef = useRef<THREE.Points>(null);

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 28;
      arr[i * 3 + 1] = Math.random() * 8 + 0.3;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 28;
    }
    return arr;
  }, [count]);

  const seeds = useMemo(
    () => new Float32Array(Array.from({ length: count }, () => Math.random() * Math.PI * 2)),
    [count]
  );

  useFrame((state) => {
    if (!pointsRef.current) return;
    const t = state.clock.getElapsedTime();
    const geom = pointsRef.current.geometry as THREE.BufferGeometry;
    const pos = geom.attributes.position as THREE.BufferAttribute;
    const arr = pos.array as Float32Array;
    for (let i = 0; i < count; i++) {
      const s = seeds[i];
      arr[i * 3 + 1] += Math.sin(t * 0.6 + s) * 0.0035;
      arr[i * 3] += Math.cos(t * 0.4 + s) * 0.0025;
    }
    pos.needsUpdate = true;
    pointsRef.current.rotation.y = t * 0.015;
  });

  return (
    <Float speed={0.5} floatIntensity={0.3} rotationIntensity={0.1}>
      <Points ref={pointsRef} positions={positions} stride={3}>
        <PointMaterial
          transparent
          depthWrite={false}
          size={0.09}
          sizeAttenuation
          color="#ffd27a"
          opacity={0.95}
          blending={THREE.AdditiveBlending}
        />
      </Points>
    </Float>
  );
}
