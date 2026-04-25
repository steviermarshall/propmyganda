import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface Props {
  onEnter: () => void;
  onHoverChange?: (hovered: boolean) => void;
}

/**
 * MASSIVE ancient tree at the heart of the clearing.
 * - Towering, heavily-barked trunk (much wider & taller than forest trees)
 * - Deep root buttresses fanning out
 * - Thick gnarled branches
 * - Layered leafy crown
 * - Glowing amber ORB portal at the base (no beams)
 */
export default function AncientTree({ onEnter, onHoverChange }: Props) {
  const orbCoreRef = useRef<THREE.Mesh>(null);
  const orbGlowRef = useRef<THREE.MeshBasicMaterial>(null);
  const orbHaloRef = useRef<THREE.Mesh>(null);
  const orbLightRef = useRef<THREE.PointLight>(null);
  const mossRefs = useRef<THREE.MeshStandardMaterial[]>([]);

  const HEIGHT = 28;
  const BASE_R = 4.2;
  const TOP_R = 1.6;

  // Trunk — sinuous tapered tube
  const trunkGeom = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0.3, HEIGHT * 0.2, -0.2),
      new THREE.Vector3(-0.4, HEIGHT * 0.45, 0.3),
      new THREE.Vector3(0.5, HEIGHT * 0.7, -0.25),
      new THREE.Vector3(-0.2, HEIGHT * 0.9, 0.2),
      new THREE.Vector3(0.1, HEIGHT, 0),
    ]);
    const g = new THREE.TubeGeometry(curve, 100, BASE_R, 24, false);
    const pos = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      const t = THREE.MathUtils.clamp(y / HEIGHT, 0, 1);
      // smoother taper with subtle bulges
      const taper = THREE.MathUtils.lerp(1.0, TOP_R / BASE_R, t);
      const bulge = 1 + Math.sin(y * 0.6) * 0.04;
      const r = taper * bulge;
      pos.setX(i, pos.getX(i) * r);
      pos.setZ(i, pos.getZ(i) * r);
    }
    pos.needsUpdate = true;
    g.computeVertexNormals();
    return g;
  }, []);

  // Root buttresses
  const roots = useMemo(() => {
    const arr: { pos: [number, number, number]; rot: [number, number, number]; scale: number }[] = [];
    const count = 11;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + Math.sin(i) * 0.25;
      const r = BASE_R * 0.85;
      arr.push({
        pos: [Math.cos(a) * r, 0.8, Math.sin(a) * r],
        rot: [Math.PI / 2 - 0.35, 0, -a + Math.PI / 2],
        scale: 0.95 + ((Math.sin(i * 7.3) + 1) / 2) * 0.5,
      });
    }
    return arr;
  }, []);

  // Vertical bark ridges (thin tall boxes hugging the trunk)
  const barkRidges = useMemo(() => {
    const arr: { a: number; y: number; h: number }[] = [];
    const count = 22;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + Math.sin(i * 1.3) * 0.1;
      const y = HEIGHT * (0.15 + ((i % 5) / 5) * 0.6);
      const h = 4 + ((Math.sin(i * 2.1) + 1) / 2) * 5;
      arr.push({ a, y, h });
    }
    return arr;
  }, []);

  // Knots / burls
  const knots = useMemo(() => {
    const arr: { pos: [number, number, number]; r: number }[] = [];
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + i;
      const y = 4 + (i % 4) * 4;
      const t = y / HEIGHT;
      const trunkR = THREE.MathUtils.lerp(BASE_R, TOP_R, t) * 0.95;
      arr.push({
        pos: [Math.cos(a) * trunkR, y, Math.sin(a) * trunkR],
        r: 0.5 + ((Math.sin(i * 3.7) + 1) / 2) * 0.4,
      });
    }
    return arr;
  }, []);

  // Major branches near the top
  const branches = useMemo(() => {
    const arr: { geom: THREE.TubeGeometry; end: THREE.Vector3 }[] = [];
    const count = 8;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + i * 0.4;
      const sy = HEIGHT * (0.7 + (i % 3) * 0.08);
      const start = new THREE.Vector3(0, sy, 0);
      const dir = new THREE.Vector3(Math.cos(a), 0.4 + Math.sin(i) * 0.2, Math.sin(a)).normalize();
      const length = 5 + ((Math.sin(i * 1.7) + 1) / 2) * 3.5;
      const pts: THREE.Vector3[] = [start.clone()];
      const segs = 6;
      for (let j = 1; j <= segs; j++) {
        const t = j / segs;
        const lift = Math.sin(t * Math.PI * 0.8) * 1.6;
        const swirl = Math.sin(t * Math.PI + i) * 0.6 * (1 - t * 0.3);
        pts.push(
          start.clone()
            .add(dir.clone().multiplyScalar(length * t))
            .add(new THREE.Vector3(0, lift, 0))
            .add(new THREE.Vector3(swirl, 0, swirl * 0.7))
        );
      }
      const curve = new THREE.CatmullRomCurve3(pts);
      const geom = new THREE.TubeGeometry(curve, 30, 0.55, 10, false);
      arr.push({ geom, end: pts[pts.length - 1] });
    }
    return arr;
  }, []);

  // Leafy canopy puffs at branch ends + crown
  const foliage = useMemo(() => {
    const arr: { pos: [number, number, number]; scale: number; alt: boolean }[] = [];
    branches.forEach((b, i) => {
      const e = b.end;
      arr.push({ pos: [e.x, e.y, e.z], scale: 2.4, alt: false });
      for (let j = 0; j < 5; j++) {
        const off = j * 1.3 + i;
        arr.push({
          pos: [
            e.x + Math.sin(off) * 1.4,
            e.y + Math.cos(j) * 0.8 + 0.4,
            e.z + Math.cos(off) * 1.4,
          ],
          scale: 1.2 + ((Math.sin(off * 2) + 1) / 2) * 0.6,
          alt: j % 2 === 0,
        });
      }
    });
    // Crown above trunk top
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      arr.push({ pos: [Math.cos(a) * 1.6, HEIGHT + 0.6, Math.sin(a) * 1.6], scale: 2.6, alt: i % 2 === 0 });
    }
    return arr;
  }, [branches]);

  // Mossy patches on the trunk
  const mossPatches = useMemo(() => {
    const arr: { pos: [number, number, number]; scale: number }[] = [];
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2 + Math.sin(i * 2.1);
      const y = 0.8 + i * 1.4 + Math.sin(i * 3.1) * 0.3;
      const t = Math.min(1, y / HEIGHT);
      const r = THREE.MathUtils.lerp(BASE_R, TOP_R, t) * 1.02;
      arr.push({
        pos: [Math.cos(a) * r, y, Math.sin(a) * r],
        scale: 0.55 + ((Math.sin(i * 1.7) + 1) / 2) * 0.35,
      });
    }
    return arr;
  }, []);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    const slow = 0.5 + Math.sin(t * 0.9) * 0.5;
    const fast = 0.5 + Math.sin(t * 2.4 + 1.2) * 0.5;
    const pulse = slow * 0.7 + fast * 0.3;

    if (orbCoreRef.current) {
      const s = 1 + pulse * 0.08;
      orbCoreRef.current.scale.set(s, s, s);
    }
    if (orbGlowRef.current) {
      orbGlowRef.current.opacity = 0.85 + pulse * 0.15;
    }
    if (orbHaloRef.current) {
      const mat = orbHaloRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.22 + pulse * 0.25;
      const s = 1 + pulse * 0.18;
      orbHaloRef.current.scale.set(s, s, s);
    }
    if (orbLightRef.current) {
      orbLightRef.current.intensity = 2.4 + pulse * 2.8;
    }
    mossRefs.current.forEach((m, i) => {
      if (m) m.emissiveIntensity = 0.3 + Math.sin(t * 1.2 + i) * 0.12;
    });
  });

  return (
    <group position={[0, 0, 0]}>
      {/* Earth mound at base */}
      <mesh position={[0, 0.2, 0]} receiveShadow>
        <sphereGeometry args={[BASE_R * 1.4, 32, 18, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#0b2218" roughness={1} />
      </mesh>

      {/* Root buttresses */}
      {roots.map((r, i) => (
        <mesh key={`root-${i}`} position={r.pos} rotation={r.rot} castShadow>
          <coneGeometry args={[0.85 * r.scale, 3.8 * r.scale, 7]} />
          <meshStandardMaterial color="#0a0f14" roughness={1} />
        </mesh>
      ))}

      {/* Trunk */}
      <mesh geometry={trunkGeom} castShadow receiveShadow>
        <meshStandardMaterial color="#11181f" roughness={0.98} />
      </mesh>

      {/* Vertical bark ridges */}
      {barkRidges.map((b, i) => {
        const t = b.y / HEIGHT;
        const trunkR = THREE.MathUtils.lerp(BASE_R, TOP_R, t) * 1.0;
        return (
          <mesh
            key={`ridge-${i}`}
            position={[Math.cos(b.a) * trunkR, b.y, Math.sin(b.a) * trunkR]}
            rotation={[0, -b.a + Math.PI / 2, 0]}
          >
            <boxGeometry args={[0.18, b.h, 0.45]} />
            <meshStandardMaterial color="#05090d" roughness={1} />
          </mesh>
        );
      })}

      {/* Horizontal bark bands */}
      {[0.18, 0.36, 0.54, 0.72].map((tt, i) => {
        const r = THREE.MathUtils.lerp(BASE_R, TOP_R, tt) * 1.03;
        return (
          <mesh key={`band-${i}`} position={[0, HEIGHT * tt, 0]}>
            <cylinderGeometry args={[r, r, 0.22, 24]} />
            <meshStandardMaterial color="#060a0e" roughness={1} />
          </mesh>
        );
      })}

      {/* Knots */}
      {knots.map((k, i) => (
        <mesh key={`knot-${i}`} position={k.pos}>
          <sphereGeometry args={[k.r, 14, 12]} />
          <meshStandardMaterial color="#080c10" roughness={1} />
        </mesh>
      ))}

      {/* Moss patches */}
      {mossPatches.map((m, i) => (
        <mesh key={`moss-${i}`} position={m.pos} scale={[m.scale, m.scale * 0.7, m.scale * 0.4]}>
          <sphereGeometry args={[1, 12, 10]} />
          <meshStandardMaterial
            ref={(el) => {
              if (el) mossRefs.current[i] = el;
            }}
            color="#1d5a44"
            emissive="#2c9a78"
            emissiveIntensity={0.3}
            roughness={1}
          />
        </mesh>
      ))}

      {/* Major branches */}
      {branches.map((b, i) => (
        <mesh key={`br-${i}`} geometry={b.geom} castShadow>
          <meshStandardMaterial color="#0b1218" roughness={1} />
        </mesh>
      ))}

      {/* Leafy canopy */}
      {foliage.map((f, i) => (
        <group key={`fo-${i}`} position={f.pos}>
          <mesh>
            <icosahedronGeometry args={[f.scale, 1]} />
            <meshStandardMaterial color={f.alt ? "#0e3a2a" : "#0a3325"} roughness={0.95} flatShading />
          </mesh>
          <mesh scale={[0.78, 0.78, 0.78]}>
            <icosahedronGeometry args={[f.scale, 1]} />
            <meshStandardMaterial
              color={f.alt ? "#1a5440" : "#175038"}
              roughness={0.9}
              flatShading
              emissive="#0a2418"
              emissiveIntensity={0.12}
            />
          </mesh>
        </group>
      ))}

      {/* ---------- Glowing Orb Portal (interactive, no beams) ---------- */}
      <group
        position={[0, 2.0, BASE_R * 0.95 + 0.3]}
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
        <mesh ref={orbHaloRef}>
          <sphereGeometry args={[1.4, 32, 32]} />
          <meshBasicMaterial
            color="#ffb14a"
            transparent
            opacity={0.28}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
        <mesh>
          <sphereGeometry args={[0.8, 32, 32]} />
          <meshBasicMaterial
            ref={orbGlowRef}
            color="#ffd27a"
            transparent
            opacity={0.9}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
        <mesh ref={orbCoreRef}>
          <sphereGeometry args={[0.45, 32, 32]} />
          <meshBasicMaterial color="#fff2c2" toneMapped={false} />
        </mesh>
        <pointLight
          ref={orbLightRef}
          intensity={3}
          color="#ffa040"
          distance={16}
          decay={2}
        />
      </group>
    </group>
  );
}
