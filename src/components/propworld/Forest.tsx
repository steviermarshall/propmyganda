import { useMemo } from "react";
import { Cylinder, Cone } from "@react-three/drei";

type Item = { pos: [number, number, number]; scale: number };

function Tree({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      <Cylinder args={[0.18, 0.32, 3.4, 8]} position={[0, 1.7, 0]} castShadow>
        <meshStandardMaterial color="#0e0a08" roughness={0.95} />
      </Cylinder>
      <Cone args={[1.7, 4.2, 10]} position={[0, 4.7, 0]}>
        <meshStandardMaterial color="#06291e" roughness={0.9} />
      </Cone>
      <Cone args={[1.35, 3.2, 10]} position={[0, 6.0, 0]}>
        <meshStandardMaterial color="#0a3a2a" roughness={0.9} />
      </Cone>
      <Cone args={[1.0, 2.4, 10]} position={[0, 7.2, 0]}>
        <meshStandardMaterial color="#0d4a36" roughness={0.9} />
      </Cone>
    </group>
  );
}

export default function Forest() {
  const trees = useMemo<Item[]>(() => {
    const items: Item[] = [];
    const seed = (n: number) => {
      const x = Math.sin(n * 9999) * 43758.5453;
      return x - Math.floor(x);
    };
    // Ring of trees, leaving the center clear for the ancient tree
    for (let i = 0; i < 28; i++) {
      const r = 9 + seed(i) * 7;
      const a = seed(i + 100) * Math.PI * 2;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      const s = 0.85 + seed(i + 200) * 0.7;
      items.push({ pos: [x, 0, z], scale: s });
    }
    return items;
  }, []);

  return (
    <group>
      {trees.map((t, i) => (
        <Tree key={i} position={t.pos} scale={t.scale} />
      ))}
    </group>
  );
}
