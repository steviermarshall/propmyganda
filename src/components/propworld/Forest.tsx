import { useMemo } from "react";
import * as THREE from "three";

/**
 * Realistic-feeling forest trees ringing the clearing.
 * Each tree: tapered trunk + root flares + 4-6 main limbs (curved tubes) +
 * leafy canopy made of layered icosahedron clusters.
 * Sized similar to (but slightly smaller than) the central ancient tree.
 */

type TreeSpec = {
  pos: [number, number, number];
  scale: number;
  trunkColor: string;
  leafColor: string;
  leafColor2: string;
  seed: number;
};

function rand(n: number) {
  const x = Math.sin(n * 9999.13) * 43758.5453;
  return x - Math.floor(x);
}

function makeBranchGeom(
  start: THREE.Vector3,
  angle: number,
  length: number,
  radius: number,
  curlSeed: number
) {
  const dir = new THREE.Vector3(Math.cos(angle), 0.55, Math.sin(angle)).normalize();
  const pts: THREE.Vector3[] = [start.clone()];
  const segs = 6;
  for (let i = 1; i <= segs; i++) {
    const t = i / segs;
    const lift = Math.sin(t * Math.PI * 0.7) * 1.2;
    const swirl = Math.sin(t * Math.PI + curlSeed) * 0.4 * (1 - t * 0.3);
    const p = start.clone()
      .add(dir.clone().multiplyScalar(length * t))
      .add(new THREE.Vector3(0, lift, 0))
      .add(new THREE.Vector3(swirl, 0, swirl * 0.7));
    pts.push(p);
  }
  const curve = new THREE.CatmullRomCurve3(pts);
  return {
    geom: new THREE.TubeGeometry(curve, 24, radius, 8, false),
    end: pts[pts.length - 1],
  };
}

function ForestTree({ spec }: { spec: TreeSpec }) {
  const { pos, scale, trunkColor, leafColor, leafColor2, seed } = spec;

  const baseHeight = 18 * scale;
  const trunkRadiusBottom = 1.1 * scale;
  const trunkRadiusTop = 0.45 * scale;

  // Trunk geometry — slightly curved + tapered tube
  const trunkGeom = useMemo(() => {
    const sway = (rand(seed) - 0.5) * 0.6;
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(sway * 0.2, baseHeight * 0.3, -sway * 0.15),
      new THREE.Vector3(sway * 0.4, baseHeight * 0.6, sway * 0.2),
      new THREE.Vector3(sway * 0.5, baseHeight * 0.85, -sway * 0.1),
      new THREE.Vector3(sway * 0.55, baseHeight, 0),
    ]);
    const g = new THREE.TubeGeometry(curve, 40, trunkRadiusBottom, 14, false);
    const posAttr = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < posAttr.count; i++) {
      const y = posAttr.getY(i);
      const t = THREE.MathUtils.clamp(y / baseHeight, 0, 1);
      const r = THREE.MathUtils.lerp(1.0, trunkRadiusTop / trunkRadiusBottom, t);
      posAttr.setX(i, posAttr.getX(i) * r);
      posAttr.setZ(i, posAttr.getZ(i) * r);
    }
    posAttr.needsUpdate = true;
    g.computeVertexNormals();
    return g;
  }, [seed, baseHeight, trunkRadiusBottom, trunkRadiusTop]);

  // Main limbs branching from upper trunk
  const branches = useMemo(() => {
    const arr: { geom: THREE.TubeGeometry; end: THREE.Vector3 }[] = [];
    const count = 5;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + rand(seed + i) * 0.6;
      const sy = baseHeight * (0.55 + rand(seed + i + 11) * 0.35);
      const start = new THREE.Vector3(0, sy, 0);
      const length = (3.2 + rand(seed + i + 22) * 2.2) * scale;
      const radius = 0.22 * scale * (0.8 + rand(seed + i + 33) * 0.4);
      arr.push(makeBranchGeom(start, a, length, radius, seed + i));
    }
    return arr;
  }, [seed, scale, baseHeight]);

  // Root flares
  const roots = useMemo(() => {
    const arr: { pos: [number, number, number]; rot: [number, number, number]; scale: number }[] = [];
    const count = 6;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + rand(seed + i + 88) * 0.4;
      arr.push({
        pos: [Math.cos(a) * trunkRadiusBottom * 0.9, 0.4, Math.sin(a) * trunkRadiusBottom * 0.9],
        rot: [Math.PI / 2 - 0.4, 0, -a + Math.PI / 2],
        scale: 0.7 + rand(seed + i + 99) * 0.4,
      });
    }
    return arr;
  }, [seed, trunkRadiusBottom]);

  // Foliage clusters at branch ends + crown
  const foliage = useMemo(() => {
    const arr: { pos: [number, number, number]; scale: number; alt: boolean }[] = [];
    branches.forEach((b, i) => {
      const e = b.end;
      const base = (1.4 + rand(seed + i + 200) * 0.8) * scale;
      arr.push({ pos: [e.x, e.y, e.z], scale: base, alt: false });
      // sub-puffs
      for (let j = 0; j < 4; j++) {
        const off = j * 1.4 + i;
        arr.push({
          pos: [
            e.x + Math.sin(off) * 0.9 * scale,
            e.y + Math.cos(j) * 0.6 * scale + 0.3,
            e.z + Math.cos(off) * 0.9 * scale,
          ],
          scale: base * (0.55 + rand(seed + i * 10 + j) * 0.3),
          alt: j % 2 === 0,
        });
      }
    });
    // Crown puffs above the trunk top
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      arr.push({
        pos: [Math.cos(a) * 0.9 * scale, baseHeight + 0.4, Math.sin(a) * 0.9 * scale],
        scale: 1.6 * scale,
        alt: i % 2 === 0,
      });
    }
    return arr;
  }, [branches, seed, scale, baseHeight]);

  return (
    <group position={pos}>
      {/* Root flares */}
      {roots.map((r, i) => (
        <mesh key={`root-${i}`} position={r.pos} rotation={r.rot}>
          <coneGeometry args={[0.35 * scale * r.scale, 1.6 * scale * r.scale, 6]} />
          <meshStandardMaterial color={trunkColor} roughness={1} />
        </mesh>
      ))}

      {/* Trunk */}
      <mesh geometry={trunkGeom} castShadow receiveShadow>
        <meshStandardMaterial color={trunkColor} roughness={0.95} />
      </mesh>

      {/* Bark detail rings */}
      {[0.25, 0.5, 0.75].map((t, i) => {
        const r = THREE.MathUtils.lerp(trunkRadiusBottom, trunkRadiusTop, t) * 1.04;
        return (
          <mesh key={`ring-${i}`} position={[0, baseHeight * t, 0]}>
            <cylinderGeometry args={[r, r, 0.15, 14]} />
            <meshStandardMaterial color="#06100c" roughness={1} />
          </mesh>
        );
      })}

      {/* Mossy patches on trunk */}
      <mesh position={[trunkRadiusBottom * 0.7, 1.4, trunkRadiusBottom * 0.4]}>
        <sphereGeometry args={[0.45 * scale, 10, 8]} />
        <meshStandardMaterial color="#1a4a38" roughness={1} emissive="#194f3c" emissiveIntensity={0.15} />
      </mesh>
      <mesh position={[-trunkRadiusBottom * 0.5, 3.2, trunkRadiusBottom * 0.6]}>
        <sphereGeometry args={[0.35 * scale, 10, 8]} />
        <meshStandardMaterial color="#16412f" roughness={1} emissive="#1c5a44" emissiveIntensity={0.18} />
      </mesh>

      {/* Branches */}
      {branches.map((b, i) => (
        <mesh key={`br-${i}`} geometry={b.geom} castShadow>
          <meshStandardMaterial color={trunkColor} roughness={1} />
        </mesh>
      ))}

      {/* Foliage */}
      {foliage.map((f, i) => (
        <group key={`fo-${i}`} position={f.pos}>
          <mesh>
            <icosahedronGeometry args={[f.scale, 1]} />
            <meshStandardMaterial color={f.alt ? leafColor2 : leafColor} roughness={0.95} flatShading />
          </mesh>
          <mesh scale={[0.78, 0.78, 0.78]}>
            <icosahedronGeometry args={[f.scale, 1]} />
            <meshStandardMaterial
              color={f.alt ? leafColor : leafColor2}
              roughness={0.9}
              flatShading
              emissive="#0a2418"
              emissiveIntensity={0.12}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* ---------- Forest ---------- */
export default function Forest() {
  const trees = useMemo<TreeSpec[]>(() => {
    const items: TreeSpec[] = [];
    // Inner ring — closer, slightly smaller
    const innerCount = 10;
    for (let i = 0; i < innerCount; i++) {
      const a = (i / innerCount) * Math.PI * 2 + rand(i) * 0.35;
      const r = 14 + rand(i + 50) * 4;
      items.push({
        pos: [Math.cos(a) * r, 0, Math.sin(a) * r],
        scale: 0.95 + rand(i + 100) * 0.35,
        trunkColor: ["#0d161e", "#101820", "#0a141c"][i % 3],
        leafColor: ["#0e3a2a", "#103e2e", "#0d3326"][i % 3],
        leafColor2: ["#1a5440", "#16523e", "#185644"][i % 3],
        seed: i + 1,
      });
    }
    // Outer ring — taller, further back
    const outerCount = 9;
    for (let i = 0; i < outerCount; i++) {
      const a = (i / outerCount) * Math.PI * 2 + 0.18 + rand(i + 200) * 0.4;
      const r = 24 + rand(i + 250) * 5;
      items.push({
        pos: [Math.cos(a) * r, 0, Math.sin(a) * r],
        scale: 1.15 + rand(i + 300) * 0.4,
        trunkColor: ["#0a121a", "#0c141c", "#08101a"][i % 3],
        leafColor: ["#0a2e22", "#0c3328", "#0b3025"][i % 3],
        leafColor2: ["#144836", "#15503e", "#124234"][i % 3],
        seed: i + 500,
      });
    }
    return items;
  }, []);

  // Ground foliage clumps
  const foliage = useMemo(() => {
    const items: { pos: [number, number, number]; scale: number }[] = [];
    for (let i = 0; i < 70; i++) {
      const a = rand(i + 700) * Math.PI * 2;
      const r = 6 + rand(i + 750) * 18;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      if (Math.hypot(x, z) < 6) continue;
      const s = 0.4 + rand(i + 800) * 0.7;
      items.push({ pos: [x, s * 0.4 - 0.1, z], scale: s });
    }
    return items;
  }, []);

  return (
    <group>
      {trees.map((t, i) => (
        <ForestTree key={i} spec={t} />
      ))}
      {foliage.map((f, i) => (
        <mesh key={`f-${i}`} position={f.pos} scale={f.scale}>
          <icosahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color="#0c3a2a" roughness={1} flatShading />
        </mesh>
      ))}
    </group>
  );
}
