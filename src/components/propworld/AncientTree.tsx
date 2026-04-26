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

  // Trunk — sinuous tapered tube with PROCEDURAL BARK displacement
  // Multi-octave noise + angular ridges create deep vertical grooves and burls.
  const trunkGeom = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0.3, HEIGHT * 0.2, -0.2),
      new THREE.Vector3(-0.4, HEIGHT * 0.45, 0.3),
      new THREE.Vector3(0.5, HEIGHT * 0.7, -0.25),
      new THREE.Vector3(-0.2, HEIGHT * 0.9, 0.2),
      new THREE.Vector3(0.1, HEIGHT, 0),
    ]);
    // Higher radial + tubular segments so displacement reads as real bark
    const g = new THREE.TubeGeometry(curve, 220, BASE_R, 64, false);
    const pos = g.attributes.position as THREE.BufferAttribute;

    // Fast hash-based pseudo noise (deterministic)
    const hash = (x: number, y: number, z: number) => {
      const s = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453;
      return s - Math.floor(s);
    };
    const fbm = (x: number, y: number, z: number) => {
      let v = 0;
      let amp = 1;
      let freq = 1;
      for (let o = 0; o < 4; o++) {
        v += (hash(x * freq, y * freq, z * freq) - 0.5) * amp;
        amp *= 0.5;
        freq *= 2.1;
      }
      return v;
    };

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);

      const t = THREE.MathUtils.clamp(y / HEIGHT, 0, 1);
      // Bottom 30% is parallel-sided (full radius), then tapers smoothly
      // up to the top radius. No bulging base.
      const PARALLEL_END = 0.3;
      let taper: number;
      if (t <= PARALLEL_END) {
        taper = 1.0;
      } else {
        const tt = (t - PARALLEL_END) / (1 - PARALLEL_END);
        taper = THREE.MathUtils.lerp(1.0, TOP_R / BASE_R, tt);
      }

      // Apply taper first
      let nx = x * taper;
      let nz = z * taper;

      // Compute angle around trunk axis for vertical ridges
      const angle = Math.atan2(nz, nx);
      const radial = Math.sqrt(nx * nx + nz * nz);

      // Vertical ridges: high-frequency angular grooves, slightly twisting up
      const ridges =
        Math.sin(angle * 22 + y * 0.18) * 0.5 +
        Math.sin(angle * 11 - y * 0.07) * 0.35;

      // FBM for organic bumps & burls
      const noise = fbm(nx * 0.8, y * 0.45, nz * 0.8) * 1.6;

      // Larger low-freq bulges
      const bulge = Math.sin(y * 0.35 + angle * 2) * 0.18;

      // Stronger displacement at the base, easing toward the top
      const baseFalloff = THREE.MathUtils.lerp(1.0, 0.45, t);

      // Total radial displacement (in world units)
      const disp = (ridges * 0.18 + noise * 0.22 + bulge) * baseFalloff;

      // Push outward along the radial direction
      if (radial > 0.0001) {
        const dirX = nx / radial;
        const dirZ = nz / radial;
        nx += dirX * disp;
        nz += dirZ * disp;
      }

      pos.setX(i, nx);
      pos.setZ(i, nz);
    }
    pos.needsUpdate = true;
    g.computeVertexNormals();
    return g;
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
      orbLightRef.current.intensity = 1.8 + pulse * 1.6;
    }
    mossRefs.current.forEach((m, i) => {
      if (m) m.emissiveIntensity = 0.3 + Math.sin(t * 1.2 + i) * 0.12;
    });
  });

  return (
    <group position={[0, 0, 0]}>
      {/* Trunk meets ground directly — no mound, no flared roots.
          The bottom of the trunk is parallel-sided. */}

      {/* Trunk — procedural bark via vertex displacement */}
      <mesh geometry={trunkGeom} castShadow receiveShadow>
        <meshStandardMaterial
          color="#141c24"
          roughness={1}
          flatShading
          emissive="#0a1814"
          emissiveIntensity={0.08}
        />
      </mesh>

      {/* Subtle dark inner shell to deepen the crevices visually */}
      <mesh geometry={trunkGeom} scale={[0.985, 1, 0.985]}>
        <meshStandardMaterial color="#03070a" roughness={1} />
      </mesh>

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

      {/* ---------- Arched Doorway + Orb Portal ----------
          A tall arched opening carved into the trunk (no door). The orb
          floats inside the doorway and its glow fills the cavity. */}
      {(() => {
        // ---- Derive doorway from actual trunk thickness ----
        // The doorway sits at its vertical CENTER around y = DOORWAY_Y_CENTER.
        // We compute the trunk's radius at that height using the SAME
        // parallel/taper formula used by the trunk geometry, so the arch
        // always scales with the real trunk silhouette.
        const PARALLEL_END = 0.3;
        const trunkRadiusAt = (y: number) => {
          const t = THREE.MathUtils.clamp(y / HEIGHT, 0, 1);
          const taper =
            t <= PARALLEL_END
              ? 1.0
              : THREE.MathUtils.lerp(
                  1.0,
                  TOP_R / BASE_R,
                  (t - PARALLEL_END) / (1 - PARALLEL_END),
                );
          return BASE_R * taper;
        };

        // Doorway sits in the lower (parallel) section of the trunk.
        const DOORWAY_BASE_Y = 0;
        const DOORWAY_TOP_Y = HEIGHT * 0.28; // stay within parallel zone
        const DH = DOORWAY_TOP_Y - DOORWAY_BASE_Y; // total height
        const DOORWAY_Y_CENTER = (DOORWAY_BASE_Y + DOORWAY_TOP_Y) / 2;

        // Trunk radius at the doorway's center → drives width.
        const trunkR = trunkRadiusAt(DOORWAY_Y_CENTER);
        // Doorway width = ~70% of the trunk diameter at this height.
        const DW = Math.min(trunkR * 1.4, DH * 0.7); // keep tall-arch proportion
        const DR = DW / 2; // arch radius (semicircle on top)

        // Sit FLUSH with — and slightly RECESSED INTO — the trunk surface.
        // Negative offset pushes the cavity inside the trunk so the bark
        // wraps around the opening instead of the arch floating in front.
        const DZ = trunkR - 0.15;

        // Arched shape (rectangle bottom + semicircle top)
        const archShape = new THREE.Shape();
        archShape.moveTo(-DR, 0);
        archShape.lineTo(-DR, DH - DR);
        archShape.absarc(0, DH - DR, DR, Math.PI, 0, true);
        archShape.lineTo(DR, 0);
        archShape.lineTo(-DR, 0);

        // Outer bark frame — proportional to doorway size (not fixed margins)
        const FRAME_THICKNESS = Math.max(0.18, DW * 0.16);
        const FW = DW + FRAME_THICKNESS * 2;
        const FH = DH + FRAME_THICKNESS;
        const FR = FW / 2;
        const frameOuter = new THREE.Shape();
        frameOuter.moveTo(-FR, 0);
        frameOuter.lineTo(-FR, FH - FR);
        frameOuter.absarc(0, FH - FR, FR, Math.PI, 0, true);
        frameOuter.lineTo(FR, 0);
        frameOuter.lineTo(-FR, 0);
        const frameHole = new THREE.Path();
        frameHole.moveTo(-DR, 0);
        frameHole.lineTo(-DR, DH - DR);
        frameHole.absarc(0, DH - DR, DR, Math.PI, 0, true);
        frameHole.lineTo(DR, 0);
        frameHole.lineTo(-DR, 0);
        frameOuter.holes.push(frameHole);

        return (
          <group
            position={[0, 0, DZ]}
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
            {/* ===== OCCLUSION-LAYERED DOORWAY ===== */}

            {/* L4 — DEEPEST: cavity back wall (furthest into the trunk).
                Pure black; the orb sits in front of this. */}
            <mesh position={[0, 0, -1.2]} scale={[0.86, 0.86, 1]}>
              <shapeGeometry args={[archShape]} />
              <meshBasicMaterial color="#000000" toneMapped={false} side={THREE.DoubleSide} />
            </mesh>

            {/* L3 — INNER CAVITY WALLS: extruded arch shell creating real
                depth between the back wall and the front opening. The
                inside of these walls catches the orb's warm light. */}
            <mesh position={[0, 0, -1.2]}>
              <extrudeGeometry
                args={[
                  archShape,
                  {
                    depth: 1.2,
                    bevelEnabled: true,
                    bevelSegments: 3,
                    bevelSize: 0.08,
                    bevelThickness: 0.08,
                    curveSegments: 24,
                  },
                ]}
              />
              <meshStandardMaterial
                color="#0a0604"
                roughness={1}
                metalness={0}
                side={THREE.BackSide}
                emissive="#2a1408"
                emissiveIntensity={0.35}
              />
            </mesh>

            {/* L2 — INNER SHADOW RING: dark soft gradient just inside the
                opening, sells the recessed depth at the mouth. */}
            <mesh position={[0, 0, -0.02]} scale={[1.0, 1.0, 1]}>
              <shapeGeometry args={[archShape]} />
              <meshBasicMaterial
                color="#000000"
                transparent
                opacity={0.55}
                depthWrite={false}
                side={THREE.DoubleSide}
              />
            </mesh>

            {/* L1 — CARVED BARK FRAME (closest to camera): raised lip
                around the doorway, sits on the trunk surface. */}
            <mesh position={[0, 0, 0.04]}>
              <shapeGeometry args={[frameOuter]} />
              <meshStandardMaterial
                color="#070b0f"
                roughness={1}
                emissive="#1a0e05"
                emissiveIntensity={0.3}
                side={THREE.DoubleSide}
              />
            </mesh>

            {/* Warm rim light hugging the inside edge of the opening */}
            <mesh position={[0, 0, 0.0]} scale={[0.96, 0.96, 1]}>
              <shapeGeometry args={[archShape]} />
              <meshBasicMaterial
                color="#ff8a30"
                transparent
                opacity={0.22}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
                toneMapped={false}
              />
            </mesh>

            {/* ===== ORB — sits DEEP inside the cavity ===== */}
            {/* Negative Z pushes it back into the recessed opening so
                the frame and inner walls occlude its outer halo. */}
            <group position={[0, DH * 0.45, -0.55]}>
              {/* Soft halo — sized so it stays inside the doorway opening */}
              <mesh ref={orbHaloRef}>
                <sphereGeometry args={[Math.min(DR * 0.95, 1.0), 32, 32]} />
                <meshBasicMaterial
                  color="#ffb14a"
                  transparent
                  opacity={0.32}
                  blending={THREE.AdditiveBlending}
                  depthWrite={false}
                  toneMapped={false}
                />
              </mesh>

              {/* Glow shell */}
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

              {/* Solid bright core */}
              <mesh ref={orbCoreRef}>
                <sphereGeometry args={[0.45, 32, 32]} />
                <meshBasicMaterial color="#fff2c2" toneMapped={false} />
              </mesh>

              {/* Warm fill light — illuminates the cavity walls/frame */}
              <pointLight
                ref={orbLightRef}
                intensity={2.6}
                color="#ffa040"
                distance={9}
                decay={2}
              />
            </group>
          </group>
        );
      })()}
    </group>
  );
}
