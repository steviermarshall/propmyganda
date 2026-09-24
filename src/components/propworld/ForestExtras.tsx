import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { PORTALS, player } from "./worldState";

function rand(n: number) {
  const x = Math.sin(n * 7131.7) * 43758.5453;
  return x - Math.floor(x);
}

/* ---------- Glowing stone path linking the three trees ---------- */
function StonePath() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const stones = useMemo(() => {
    const segs: [number, number, number, number][] = [
      [0, 11, 0, 0.4],   // spine to crimson tree
      [0, 3.4, -7, 3.2], // branch to blue tree
      [0, 3.4, 7, 3.2],  // branch to amber tree
    ];
    const out: { x: number; z: number; s: number; r: number }[] = [];
    let i = 0;
    for (const [x0, z0, x1, z1] of segs) {
      const len = Math.hypot(x1 - x0, z1 - z0);
      const n = Math.floor(len / 0.75);
      for (let k = 0; k <= n; k++) {
        const t = k / n;
        const nx = -(z1 - z0) / len, nz = (x1 - x0) / len;
        const side = (rand(i) - 0.5) * 0.7;
        out.push({
          x: x0 + (x1 - x0) * t + nx * side,
          z: z0 + (z1 - z0) * t + nz * side,
          s: 0.28 + rand(i + 9) * 0.18,
          r: rand(i + 3) * Math.PI,
        });
        i++;
      }
    }
    return out;
  }, []);

  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const d = new THREE.Object3D();
    stones.forEach((s, i) => {
      d.position.set(s.x, 0.03, s.z);
      d.rotation.set(0, s.r, 0);
      d.scale.set(s.s * 1.3, 0.06, s.s);
      d.updateMatrix();
      m.setMatrixAt(i, d.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  }, [stones]);

  return (
    <instancedMesh ref={ref} args={[undefined as never, undefined as never, stones.length]} receiveShadow>
      <cylinderGeometry args={[1, 1, 1, 7]} />
      <meshStandardMaterial color="#3b4c4c" emissive="#1c6b6b" emissiveIntensity={0.35} roughness={0.9} flatShading />
    </instancedMesh>
  );
}

/* ---------- Lantern posts along the path ---------- */
const LANTERNS: [number, number][] = [
  [1.1, 9.5], [-1.1, 6.5], [1.1, 4.2], [-3.6, 4.2], [3.6, 4.2], [-1.1, 1.2],
];
function Lanterns() {
  const glow = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(({ clock }) => {
    if (glow.current) glow.current.emissiveIntensity = 2.4 + Math.sin(clock.elapsedTime * 3.1) * 0.35;
  });
  return (
    <>
      {LANTERNS.map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 0.6, 0]} castShadow>
            <cylinderGeometry args={[0.04, 0.06, 1.2, 6]} />
            <meshStandardMaterial color="#1a1410" roughness={1} />
          </mesh>
          <mesh position={[0, 1.28, 0]}>
            <octahedronGeometry args={[0.13, 0]} />
            <meshStandardMaterial ref={i === 0 ? glow : undefined} color="#ffe2a8" emissive="#ffb04a" emissiveIntensity={2.4} />
          </mesh>
          {i % 2 === 0 && <pointLight position={[0, 1.3, 0]} color="#ffb85c" intensity={0.9} distance={5} decay={2} />}
        </group>
      ))}
    </>
  );
}

/* ---------- Moonlit pond ---------- */
function Pond() {
  const water = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(({ clock }) => {
    if (water.current) water.current.roughness = 0.06 + Math.sin(clock.elapsedTime * 0.8) * 0.03;
  });
  const rim = useMemo(
    () => Array.from({ length: 16 }, (_, i) => {
      const a = (i / 16) * Math.PI * 2 + rand(i) * 0.2;
      const r = 2.05 + rand(i + 4) * 0.2;
      return { x: Math.cos(a) * r, z: Math.sin(a) * r, s: 0.18 + rand(i + 7) * 0.2 };
    }),
    [],
  );
  return (
    <group position={[-5.5, 0, 7.5]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <circleGeometry args={[2, 40]} />
        <meshStandardMaterial ref={water} color="#06232e" metalness={0.9} roughness={0.08} envMapIntensity={1.4} />
      </mesh>
      {/* moon reflection */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.5, 0.04, -0.4]}>
        <circleGeometry args={[0.35, 24]} />
        <meshBasicMaterial color="#d8f6ff" transparent opacity={0.55} depthWrite={false} />
      </mesh>
      {rim.map((r, i) => (
        <mesh key={i} position={[r.x, r.s * 0.3, r.z]} scale={[r.s * 1.4, r.s, r.s]}>
          <dodecahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color="#2c3838" roughness={1} flatShading />
        </mesh>
      ))}
      {[[-0.8, 0.5], [0.9, 0.9], [-0.2, -1.1]].map(([x, z], i) => (
        <mesh key={`pad-${i}`} rotation={[-Math.PI / 2, 0, i]} position={[x, 0.05, z]}>
          <circleGeometry args={[0.28, 12, 0, Math.PI * 1.8]} />
          <meshStandardMaterial color="#1f5a3a" roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

/* ---------- Glow mushrooms that brighten as you pass ---------- */
function Mushrooms() {
  const items = useMemo(
    () => Array.from({ length: 16 }, (_, i) => {
      const a = rand(i + 40) * Math.PI * 2;
      const r = 4 + rand(i + 41) * 8;
      return { x: Math.cos(a) * r, z: Math.sin(a) * r, s: 0.6 + rand(i + 42) * 0.6, hue: i % 3 };
    }).filter((m) => Math.abs(m.x) > 1.4 && Math.hypot(m.x + 5.5, m.z - 7.5) > 2.6),
    [],
  );
  const mats = useRef<(THREE.MeshStandardMaterial | null)[]>([]);
  useFrame(() => {
    items.forEach((m, i) => {
      const mat = mats.current[i];
      if (!mat) return;
      const d = Math.hypot(player.pos.x - m.x, player.pos.z - m.z);
      const target = d < 2.5 ? 4 : 0.8;
      mat.emissiveIntensity += (target - mat.emissiveIntensity) * 0.08;
    });
  });
  const colors = ["#5ff2ff", "#b58cff", "#7dffb0"];
  return (
    <>
      {items.map((m, i) => (
        <group key={i} position={[m.x, 0, m.z]} scale={m.s}>
          <mesh position={[0, 0.15, 0]}>
            <cylinderGeometry args={[0.04, 0.06, 0.3, 6]} />
            <meshStandardMaterial color="#d8e8e0" roughness={0.8} />
          </mesh>
          <mesh position={[0, 0.3, 0]}>
            <sphereGeometry args={[0.16, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial
              ref={(el) => { mats.current[i] = el; }}
              color={colors[m.hue]}
              emissive={colors[m.hue]}
              emissiveIntensity={0.8}
            />
          </mesh>
        </group>
      ))}
    </>
  );
}

/* ---------- Drifting ground mist ---------- */
function Mist({ count }: { count: number }) {
  const tex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const g = c.getContext("2d")!;
    const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, "rgba(180,235,240,0.9)");
    grad.addColorStop(1, "rgba(180,235,240,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  const puffs = useMemo(
    () => Array.from({ length: count }, (_, i) => ({
      x: (rand(i + 60) - 0.5) * 24,
      z: (rand(i + 61) - 0.5) * 24,
      y: 0.25 + rand(i + 62) * 0.6,
      s: 5 + rand(i + 63) * 6,
      sp: 0.15 + rand(i + 64) * 0.2,
    })),
    [count],
  );
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    puffs.forEach((p, i) => {
      const m = refs.current[i];
      if (!m) return;
      m.position.x = ((p.x + t * p.sp + 12) % 24) - 12;
      m.position.z = p.z + Math.sin(t * 0.2 + i) * 0.8;
    });
  });
  return (
    <>
      {puffs.map((p, i) => (
        <mesh key={i} ref={(el) => { refs.current[i] = el; }} rotation={[-Math.PI / 2, 0, 0]} position={[p.x, p.y, p.z]}>
          <planeGeometry args={[p.s, p.s]} />
          <meshBasicMaterial map={tex} transparent opacity={0.13} depthWrite={false} />
        </mesh>
      ))}
    </>
  );
}

/* ---------- Falling leaves / spores ---------- */
function Leaves({ count }: { count: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const data = useMemo(
    () => Array.from({ length: count }, (_, i) => ({
      x: (rand(i + 80) - 0.5) * 26,
      z: (rand(i + 81) - 0.5) * 26,
      y0: rand(i + 82) * 9,
      sp: 0.35 + rand(i + 83) * 0.4,
      ph: rand(i + 84) * 10,
    })),
    [count],
  );
  const d = useMemo(() => new THREE.Object3D(), []);
  useFrame(({ clock }) => {
    const m = ref.current;
    if (!m) return;
    const t = clock.elapsedTime;
    data.forEach((l, i) => {
      const y = 9 - ((l.y0 + t * l.sp) % 9);
      d.position.set(l.x + Math.sin(t + l.ph) * 0.6, y, l.z + Math.cos(t * 0.7 + l.ph) * 0.4);
      d.rotation.set(t * 1.3 + l.ph, t + l.ph, 0);
      d.scale.setScalar(0.09);
      d.updateMatrix();
      m.setMatrixAt(i, d.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={ref} args={[undefined as never, undefined as never, count]}>
      <planeGeometry args={[1, 0.6]} />
      <meshStandardMaterial color="#3fae7a" emissive="#1d6b4a" emissiveIntensity={0.6} side={THREE.DoubleSide} />
    </instancedMesh>
  );
}

/* ---------- Colored light pooling at each sacred tree ---------- */
function TreeLights() {
  return (
    <>
      {PORTALS.map((p) => (
        <pointLight key={p.id} position={[p.door[0], 1.6, p.door[1]]} color={p.color} intensity={2.2} distance={7} decay={2} />
      ))}
      {PORTALS.map((p) => (
        <mesh key={`${p.id}-ring`} rotation={[-Math.PI / 2, 0, 0]} position={[p.door[0], 0.035, p.door[1]]}>
          <ringGeometry args={[0.7, 0.85, 40]} />
          <meshBasicMaterial color={p.color} transparent opacity={0.55} depthWrite={false} />
        </mesh>
      ))}
    </>
  );
}

export default function ForestExtras({ isMobile }: { isMobile: boolean }) {
  return (
    <group>
      <StonePath />
      <Lanterns />
      <Pond />
      <Mushrooms />
      <Mist count={isMobile ? 5 : 10} />
      <Leaves count={isMobile ? 50 : 120} />
      <TreeLights />
    </group>
  );
}
