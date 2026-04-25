import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface Props {
  onEnter: () => void;
  onHoverChange?: (hovered: boolean) => void;
}

/**
 * Gnarled, twisting ancient tree inspired by enchanted-forest references.
 * - Sinuous trunk built from a CatmullRomCurve3 + TubeGeometry
 * - Multiple curling branches reaching outward
 * - Moss highlights on the windward side (cyan/teal emissive accents)
 * - Leafy canopy clusters at the top
 * - A single glowing amber ORB hovering at the base hollow (clickable portal)
 *   No light beams — just a soft pulsing sphere with a halo.
 */

function makeTrunkCurve() {
  return new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.2, 0, 0.1),
    new THREE.Vector3(-0.4, 2.2, 0.6),
    new THREE.Vector3(0.6, 4.6, -0.3),
    new THREE.Vector3(-0.3, 7.0, 0.4),
    new THREE.Vector3(0.5, 9.4, -0.2),
    new THREE.Vector3(-0.2, 11.8, 0.3),
  ]);
}

function makeBranchCurve(
  start: THREE.Vector3,
  dir: THREE.Vector3,
  length: number,
  curlSeed: number
): THREE.CatmullRomCurve3 {
  const pts: THREE.Vector3[] = [start.clone()];
  const segs = 6;
  const up = new THREE.Vector3(0, 1, 0);
  for (let i = 1; i <= segs; i++) {
    const t = i / segs;
    const swirl = Math.sin(t * Math.PI * 1.6 + curlSeed) * 0.9 * (1 - t * 0.4);
    const lift = Math.sin(t * Math.PI) * 1.4;
    const p = start.clone()
      .add(dir.clone().multiplyScalar(length * t))
      .add(up.clone().multiplyScalar(lift))
      .add(new THREE.Vector3(swirl, 0, swirl * 0.7));
    pts.push(p);
  }
  return new THREE.CatmullRomCurve3(pts);
}

interface BranchDef {
  curve: THREE.CatmullRomCurve3;
  radius: number;
  end: THREE.Vector3;
}

export default function AncientTree({ onEnter, onHoverChange }: Props) {
  const orbMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const orbHaloRef = useRef<THREE.Mesh>(null);
  const orbCoreRef = useRef<THREE.Mesh>(null);
  const orbLightRef = useRef<THREE.PointLight>(null);
  const mossRefs = useRef<THREE.MeshStandardMaterial[]>([]);

  const trunkGeom = useMemo(() => {
    const curve = makeTrunkCurve();
    return new THREE.TubeGeometry(curve, 80, 1.6, 16, false);
  }, []);

  // Taper the trunk by scaling vertices along Y
  const taperedTrunk = useMemo(() => {
    const g = trunkGeom.clone();
    const pos = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      const t = Math.min(1, Math.max(0, y / 12));
      const r = THREE.MathUtils.lerp(1.0, 0.35, t); // wider at base, thinner up top
      // distance from center axis (approx using x/z relative to trunk centerline ~0)
      const x = pos.getX(i);
      const z = pos.getZ(i);
      pos.setX(i, x * r);
      pos.setZ(i, z * r);
    }
    pos.needsUpdate = true;
    g.computeVertexNormals();
    return g;
  }, [trunkGeom]);

  const branches = useMemo<BranchDef[]>(() => {
    const defs: BranchDef[] = [];
    const startsY = [6.5, 7.8, 9.0, 10.2, 11.0, 11.6];
    const count = 9;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + i * 0.31;
      const sy = startsY[i % startsY.length];
      const start = new THREE.Vector3(Math.cos(a) * 0.4, sy, Math.sin(a) * 0.4);
      const dir = new THREE.Vector3(Math.cos(a), 0.35 + Math.sin(i) * 0.2, Math.sin(a)).normalize();
      const length = 3.2 + ((Math.sin(i * 1.7) + 1) / 2) * 2.8;
      const curve = makeBranchCurve(start, dir, length, i * 1.7);
      defs.push({
        curve,
        radius: 0.32 + ((Math.sin(i * 2.3) + 1) / 2) * 0.18,
        end: curve.getPoint(1),
      });
    }
    return defs;
  }, []);

  // Moss patch positions along the trunk (windward / front-left bias)
  const mossPatches = useMemo(() => {
    const arr: { pos: [number, number, number]; scale: [number, number, number]; rot: number }[] = [];
    for (let i = 0; i < 14; i++) {
      const y = 0.8 + i * 0.78 + (Math.sin(i * 3.1) + 1) * 0.2;
      const a = -0.6 + Math.sin(i * 2.3) * 0.5; // bias toward front
      const r = 1.05 - Math.min(0.7, y / 18);
      arr.push({
        pos: [Math.cos(a) * r, y, Math.sin(a) * r + 0.1],
        scale: [0.7 + Math.sin(i) * 0.15, 0.45, 0.18],
        rot: a,
      });
    }
    return arr;
  }, []);

  // Foliage clusters at branch ends + top
  const foliage = useMemo(() => {
    const arr: { pos: [number, number, number]; scale: number }[] = [];
    branches.forEach((b, i) => {
      const e = b.end;
      const baseScale = 0.9 + ((Math.sin(i * 2.7) + 1) / 2) * 0.5;
      arr.push({ pos: [e.x, e.y, e.z], scale: baseScale });
      // sub-clusters
      for (let j = 0; j < 3; j++) {
        const off = j * 1.3;
        arr.push({
          pos: [
            e.x + Math.sin(i * 2 + j) * 0.7,
            e.y + 0.4 + Math.cos(j) * 0.3,
            e.z + Math.cos(i * 2 + j) * 0.7,
          ],
          scale: baseScale * (0.55 + (Math.sin(off) + 1) * 0.2),
        });
      }
    });
    // Crown clusters
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      arr.push({ pos: [Math.cos(a) * 1.2, 12.5 + Math.sin(i) * 0.4, Math.sin(a) * 1.2], scale: 1.2 });
    }
    return arr;
  }, [branches]);

  // Hanging vines from select branches
  const vines = useMemo(() => {
    return branches.slice(0, 5).map((b, i) => {
      const e = b.end;
      const drop = 2.5 + (i % 3) * 0.7;
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(e.x, e.y, e.z),
        new THREE.Vector3(e.x + 0.1, e.y - drop * 0.4, e.z + 0.1),
        new THREE.Vector3(e.x - 0.1, e.y - drop * 0.8, e.z - 0.05),
        new THREE.Vector3(e.x, e.y - drop, e.z),
      ]);
      return new THREE.TubeGeometry(curve, 24, 0.04, 6, false);
    });
  }, [branches]);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    const slow = 0.5 + Math.sin(t * 0.9) * 0.5;
    const fast = 0.5 + Math.sin(t * 2.4 + 1.2) * 0.5;
    const pulse = slow * 0.7 + fast * 0.3;

    if (orbCoreRef.current) {
      const s = 1 + pulse * 0.08;
      orbCoreRef.current.scale.set(s, s, s);
    }
    if (orbMatRef.current) {
      orbMatRef.current.opacity = 0.85 + pulse * 0.15;
    }
    if (orbHaloRef.current) {
      const mat = orbHaloRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.22 + pulse * 0.25;
      const s = 1 + pulse * 0.18;
      orbHaloRef.current.scale.set(s, s, s);
    }
    if (orbLightRef.current) {
      orbLightRef.current.intensity = 2.2 + pulse * 2.6;
    }
    // Moss subtle breathing
    mossRefs.current.forEach((m, i) => {
      if (m) m.emissiveIntensity = 0.35 + Math.sin(t * 1.3 + i) * 0.15;
    });
  });

  return (
    <group position={[0, 0, 0]}>
      {/* Mossy mound base */}
      <mesh position={[0, 0.15, 0.3]} receiveShadow>
        <sphereGeometry args={[3.2, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#0a3326" roughness={1} />
      </mesh>
      <mesh position={[0.4, 0.05, 1.2]} receiveShadow>
        <sphereGeometry args={[1.8, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#0d4030" roughness={1} emissive="#0a2a22" emissiveIntensity={0.25} />
      </mesh>

      {/* Trunk — sinuous, tapered, moonlit */}
      <mesh geometry={taperedTrunk} castShadow receiveShadow>
        <meshStandardMaterial color="#1a2230" roughness={0.95} />
      </mesh>

      {/* Bark highlight — additive cyan rim on the front */}
      <mesh geometry={taperedTrunk} scale={[1.005, 1.005, 1.005]}>
        <meshBasicMaterial
          color="#3a8aa8"
          transparent
          opacity={0.12}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {/* Moss patches on the trunk — emissive cyan/teal */}
      {mossPatches.map((m, i) => (
        <mesh key={`moss-${i}`} position={m.pos} rotation={[0, m.rot + Math.PI / 2, 0]}>
          <sphereGeometry args={[0.55, 12, 8]} />
          <meshStandardMaterial
            ref={(el) => {
              if (el) mossRefs.current[i] = el;
            }}
            color="#1f5a48"
            emissive="#3fe0c2"
            emissiveIntensity={0.4}
            roughness={1}
          />
        </mesh>
      ))}

      {/* Branches — curling tubes */}
      {branches.map((b, i) => {
        const geom = new THREE.TubeGeometry(b.curve, 40, b.radius, 10, false);
        return (
          <mesh key={`branch-${i}`} geometry={geom} castShadow>
            <meshStandardMaterial color="#10171f" roughness={1} />
          </mesh>
        );
      })}

      {/* Hanging vines */}
      {vines.map((g, i) => (
        <mesh key={`vine-${i}`} geometry={g}>
          <meshStandardMaterial color="#0c3a2c" roughness={1} emissive="#1d6a52" emissiveIntensity={0.2} />
        </mesh>
      ))}

      {/* Foliage clusters — leafy crown */}
      {foliage.map((f, i) => (
        <group key={`foliage-${i}`} position={f.pos}>
          <mesh>
            <icosahedronGeometry args={[f.scale, 1]} />
            <meshStandardMaterial color="#0e3a2a" roughness={0.95} />
          </mesh>
          <mesh scale={[0.85, 0.85, 0.85]}>
            <icosahedronGeometry args={[f.scale, 1]} />
            <meshStandardMaterial
              color="#1b6a4a"
              roughness={0.9}
              emissive="#1a4a38"
              emissiveIntensity={0.15}
            />
          </mesh>
        </group>
      ))}

      {/* ---------- The Glowing Orb Portal (interactive) ---------- */}
      <group
        position={[0, 1.6, 1.6]}
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
        {/* Outer halo (soft amber bloom-catcher) */}
        <mesh ref={orbHaloRef}>
          <sphereGeometry args={[1.25, 32, 32]} />
          <meshBasicMaterial
            color="#ffb14a"
            transparent
            opacity={0.28}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>

        {/* Mid glow shell */}
        <mesh>
          <sphereGeometry args={[0.75, 32, 32]} />
          <meshBasicMaterial
            ref={orbMatRef}
            color="#ffd27a"
            transparent
            opacity={0.9}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>

        {/* Solid bright core */}
        <mesh ref={orbCoreRef}>
          <sphereGeometry args={[0.42, 32, 32]} />
          <meshBasicMaterial color="#fff2c2" toneMapped={false} />
        </mesh>

        {/* Single point light — no beams */}
        <pointLight
          ref={orbLightRef}
          intensity={3}
          color="#ffa040"
          distance={14}
          decay={2}
        />
      </group>
    </group>
  );
}
