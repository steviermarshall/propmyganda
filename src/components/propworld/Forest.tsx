import { useMemo } from "react";
import * as THREE from "three";
import { Cylinder } from "@react-three/drei";

type TreeSpec = {
  pos: [number, number, number];
  scale: number;
  height: number;
  radiusTop: number;
  radiusBottom: number;
  hue: number; // dark blue-green tint
};

type RootSpec = {
  parentPos: [number, number, number];
  angle: number;
  length: number;
  thickness: number;
};

type VineSpec = {
  pos: [number, number, number];
  length: number;
  sway: number;
};

type FoliageSpec = {
  pos: [number, number, number];
  scale: number;
};

/* ---------- Vine: a thin curved tube hanging from canopy ---------- */
function Vine({ pos, length, sway }: VineSpec) {
  const geom = useMemo(() => {
    const points: THREE.Vector3[] = [];
    const segs = 10;
    for (let i = 0; i <= segs; i++) {
      const k = i / segs;
      const y = -length * k;
      // gentle curl
      const x = Math.sin(k * Math.PI * 1.2 + sway) * 0.25 * (1 - k);
      const z = Math.cos(k * Math.PI * 0.9 + sway) * 0.18 * (1 - k);
      points.push(new THREE.Vector3(x, y, z));
    }
    const curve = new THREE.CatmullRomCurve3(points);
    return new THREE.TubeGeometry(curve, 14, 0.035, 6, false);
  }, [length, sway]);

  return (
    <mesh position={pos} geometry={geom}>
      <meshStandardMaterial color="#0a1810" roughness={1} />
    </mesh>
  );
}

/* ---------- Root: a tilted tapered cylinder fanning from a trunk ---------- */
function Root({ parentPos, angle, length, thickness }: RootSpec) {
  const x = parentPos[0] + Math.cos(angle) * (thickness * 1.6);
  const z = parentPos[2] + Math.sin(angle) * (thickness * 1.6);
  return (
    <Cylinder
      args={[thickness * 0.4, thickness, length, 8]}
      position={[x, parentPos[1] - length * 0.35, z]}
      rotation={[Math.PI / 2 - 0.5, 0, -angle + Math.PI / 2]}
    >
      <meshStandardMaterial color="#0a1410" roughness={1} />
    </Cylinder>
  );
}

/* ---------- Mossy foliage clump (low-poly icosahedron) ---------- */
function Foliage({ pos, scale }: FoliageSpec) {
  return (
    <mesh position={pos} scale={scale}>
      <icosahedronGeometry args={[1, 0]} />
      <meshStandardMaterial color="#0c3a2a" roughness={1} flatShading />
    </mesh>
  );
}

/* ---------- Single ancient tree (cylindrical trunk + roots + vines) ---------- */
function GiantTree({ spec }: { spec: TreeSpec }) {
  const { pos, scale, height, radiusTop, radiusBottom, hue } = spec;

  const roots = useMemo<RootSpec[]>(() => {
    const arr: RootSpec[] = [];
    const count = 7;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + Math.sin(i * 1.3) * 0.3;
      arr.push({
        parentPos: [pos[0], 1.0 * scale, pos[2]],
        angle: a,
        length: 2.4 * scale * (0.85 + Math.sin(i * 7) * 0.2),
        thickness: radiusBottom * 0.55,
      });
    }
    return arr;
  }, [pos, scale, radiusBottom]);

  const vines = useMemo<VineSpec[]>(() => {
    const arr: VineSpec[] = [];
    const count = 6;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + Math.sin(i * 2.7);
      const r = radiusTop * 0.95;
      arr.push({
        pos: [
          pos[0] + Math.cos(a) * r,
          pos[1] + height * 0.85,
          pos[2] + Math.sin(a) * r,
        ],
        length: 3.5 + ((Math.sin(i * 3.1) + 1) / 2) * 4,
        sway: i * 0.7,
      });
    }
    return arr;
  }, [pos, height, radiusTop]);

  // Subtle hue variation on trunks
  const trunkColor = useMemo(() => {
    const c = new THREE.Color("#0e1a14");
    c.offsetHSL(hue * 0.02, 0, hue * 0.05);
    return c;
  }, [hue]);

  return (
    <group>
      {/* Massive cylindrical trunk */}
      <Cylinder
        args={[radiusTop, radiusBottom, height, 14]}
        position={[pos[0], pos[1] + height / 2, pos[2]]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color={trunkColor} roughness={0.98} />
      </Cylinder>

      {/* Bark grain ridges */}
      {[0.2, 0.45, 0.7].map((y, i) => (
        <Cylinder
          key={i}
          args={[radiusBottom * (1 - y * 0.3) + 0.04, radiusBottom * (1 - y * 0.3) + 0.04, 0.18, 14]}
          position={[pos[0], pos[1] + height * y, pos[2]]}
        >
          <meshStandardMaterial color="#050a07" roughness={1} />
        </Cylinder>
      ))}

      {/* Mossy patches climbing the trunk */}
      <mesh position={[pos[0] + radiusBottom * 0.85, pos[1] + 1.2, pos[2] + radiusBottom * 0.4]}>
        <sphereGeometry args={[0.55, 8, 8]} />
        <meshStandardMaterial color="#0c3a2a" roughness={1} flatShading />
      </mesh>
      <mesh position={[pos[0] - radiusBottom * 0.7, pos[1] + 2.4, pos[2] + radiusBottom * 0.6]}>
        <sphereGeometry args={[0.45, 8, 8]} />
        <meshStandardMaterial color="#0a3225" roughness={1} flatShading />
      </mesh>

      {/* Roots fanning out */}
      {roots.map((r, i) => (
        <Root key={`r-${i}`} {...r} />
      ))}

      {/* Hanging vines */}
      {vines.map((v, i) => (
        <Vine key={`v-${i}`} {...v} />
      ))}
    </group>
  );
}

/* ---------- Forest ---------- */
export default function Forest() {
  // Background giant trees ringing the clearing (leaving the center for the AncientTree)
  const trees = useMemo<TreeSpec[]>(() => {
    const items: TreeSpec[] = [];
    const seed = (n: number) => {
      const x = Math.sin(n * 9999) * 43758.5453;
      return x - Math.floor(x);
    };
    const count = 14;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + seed(i) * 0.4;
      const r = 13 + seed(i + 50) * 7;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      const s = 1.0 + seed(i + 100) * 0.6;
      const h = 22 + seed(i + 200) * 10;
      const rb = 1.4 + seed(i + 300) * 0.7;
      const rt = rb * (0.55 + seed(i + 400) * 0.2);
      items.push({
        pos: [x, 0, z],
        scale: s,
        height: h,
        radiusBottom: rb,
        radiusTop: rt,
        hue: seed(i + 500),
      });
    }
    return items;
  }, []);

  // Mossy foliage clumps scattered on the ground
  const foliage = useMemo<FoliageSpec[]>(() => {
    const items: FoliageSpec[] = [];
    const seed = (n: number) => {
      const x = Math.sin(n * 7919.31) * 43758.5453;
      return x - Math.floor(x);
    };
    for (let i = 0; i < 60; i++) {
      const a = seed(i) * Math.PI * 2;
      const r = 6 + seed(i + 50) * 14;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      // skip if too close to center (where ancient tree sits)
      if (Math.hypot(x, z) < 5.5) continue;
      const s = 0.4 + seed(i + 100) * 0.7;
      items.push({ pos: [x, s * 0.4 - 0.1, z], scale: s });
    }
    return items;
  }, []);

  return (
    <group>
      {trees.map((t, i) => (
        <GiantTree key={i} spec={t} />
      ))}
      {foliage.map((f, i) => (
        <Foliage key={`f-${i}`} {...f} />
      ))}
    </group>
  );
}
