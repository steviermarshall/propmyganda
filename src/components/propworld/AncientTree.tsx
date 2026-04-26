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

  // ---- Shared doorway zone (used by trunk geometry, knots, moss, portal) ----
  // The doorway occupies an angular slice on the +Z (front) face of the trunk,
  // from y=0 up to DOORWAY_TOP_Y. Trunk geometry skips faces inside this
  // silhouette so no bark protrudes through the portal.
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
  const DOORWAY_BASE_Y = 0;
  const DOORWAY_TOP_Y = HEIGHT * 0.28;
  const DH = DOORWAY_TOP_Y - DOORWAY_BASE_Y;
  const DOORWAY_Y_CENTER = (DOORWAY_BASE_Y + DOORWAY_TOP_Y) / 2;
  const doorwayTrunkR = trunkRadiusAt(DOORWAY_Y_CENTER);
  const DW = Math.min(doorwayTrunkR * 1.4, DH * 0.7);
  const DR = DW / 2;

  // Returns true if a point on the trunk surface (world coords) falls inside
  // the doorway silhouette — used to exclude trunk faces, knots, moss.
  const insideDoorway = (x: number, y: number, z: number) => {
    if (y < DOORWAY_BASE_Y - 0.4 || y > DOORWAY_TOP_Y + 0.4) return false;
    if (z <= 0) return false; // back of trunk
    // Approximate horizontal arc-position on the front face
    const angle = Math.atan2(x, z); // 0 = front, ±π/2 = sides
    const trunkR = trunkRadiusAt(Math.max(0, y));
    const lx = angle * trunkR;
    if (Math.abs(lx) > DR + 0.15) return false;
    const ly = y - DOORWAY_BASE_Y;
    if (ly < -0.2) return false;
    if (ly > DH + 0.2) return false;
    if (ly <= DH - DR) return true; // rectangle portion (with margin)
    // Top semicircle
    const dx = lx;
    const dy = ly - (DH - DR);
    return dx * dx + dy * dy <= (DR + 0.15) * (DR + 0.15);
  };


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
      // Bottom 30% is parallel-sided (full radius), then tapers smoothly.
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

    // ---- Carve the doorway hole into the trunk ----
    // Drop any triangle whose centroid falls inside the doorway silhouette,
    // so bark never protrudes through the portal.
    const idx = g.getIndex();
    if (idx) {
      const src = idx.array as ArrayLike<number>;
      const kept: number[] = [];
      for (let f = 0; f < src.length; f += 3) {
        const a = src[f], b = src[f + 1], c = src[f + 2];
        const cx = (pos.getX(a) + pos.getX(b) + pos.getX(c)) / 3;
        const cy = (pos.getY(a) + pos.getY(b) + pos.getY(c)) / 3;
        const cz = (pos.getZ(a) + pos.getZ(b) + pos.getZ(c)) / 3;
        if (!insideDoorway(cx, cy, cz)) {
          kept.push(a, b, c);
        }
      }
      g.setIndex(kept);
    }
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
      const px = Math.cos(a) * trunkR;
      const pz = Math.sin(a) * trunkR;
      // Skip knots that fall inside the doorway zone
      if (insideDoorway(px, y, pz)) continue;
      arr.push({
        pos: [px, y, pz],
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

        const DOORWAY_BASE_Y = 0;
        const DOORWAY_TOP_Y = HEIGHT * 0.28;
        const DH = DOORWAY_TOP_Y - DOORWAY_BASE_Y;
        const DOORWAY_Y_CENTER = (DOORWAY_BASE_Y + DOORWAY_TOP_Y) / 2;

        const trunkR = trunkRadiusAt(DOORWAY_Y_CENTER);
        const DW = Math.min(trunkR * 1.4, DH * 0.7);
        const DR = DW / 2;

        // Build a CURVED arch mesh that wraps onto the trunk surface.
        // The arch occupies an angular slice of the trunk's cylinder.
        // Half-angle = arc-length / radius; we use trunk radius for curvature.
        const halfAngle = DW / 2 / trunkR;
        const segsX = 48; // horizontal segments around the trunk
        const segsY = 96; // vertical segments along the doorway height
        const positions: number[] = [];
        const uvs: number[] = [];
        const indices: number[] = [];

        // Test if a 2D point (localX, localY) is inside the arch silhouette.
        // localY in [0, DH], localX in [-DR, DR].
        const insideArch = (lx: number, ly: number) => {
          if (ly < 0 || ly > DH) return false;
          if (lx < -DR || lx > DR) return false;
          if (ly <= DH - DR) return true; // rectangle portion
          // Top semicircle: center (0, DH-DR), radius DR
          const dx = lx;
          const dy = ly - (DH - DR);
          return dx * dx + dy * dy <= DR * DR;
        };

        // Generate a grid of vertices spanning the arch's bounding box,
        // projected onto the trunk's cylindrical surface. Vertices outside
        // the arch silhouette get pushed slightly inward AND get a UV mask
        // so the fragment shader (via vertex color alpha) discards them —
        // simpler approach: only build faces where ALL 4 corners are inside.
        const inside: boolean[] = [];
        for (let iy = 0; iy <= segsY; iy++) {
          const v = iy / segsY;
          const ly = v * DH;
          for (let ix = 0; ix <= segsX; ix++) {
            const u = ix / segsX;
            const lx = (u - 0.5) * DW;

            // Map lx → angle on trunk cylinder (front-facing, around +Z axis)
            // Front of trunk = angle 0 measured from +Z; +X is right.
            const angle = (lx / trunkR); // small-angle wrap is fine here
            const px = Math.sin(angle) * (trunkR + 0.02); // tiny outward offset
            const pz = Math.cos(angle) * (trunkR + 0.02);
            const py = ly;

            positions.push(px, py, pz);
            uvs.push(u, v);
            inside.push(insideArch(lx, ly));
          }
        }
        const stride = segsX + 1;
        for (let iy = 0; iy < segsY; iy++) {
          for (let ix = 0; ix < segsX; ix++) {
            const a = iy * stride + ix;
            const b = a + 1;
            const c = a + stride;
            const d = c + 1;
            // Only include face if all 4 corners are inside the arch
            if (inside[a] && inside[b] && inside[c] && inside[d]) {
              indices.push(a, c, b, b, c, d);
            }
          }
        }

        const archGeom = new THREE.BufferGeometry();
        archGeom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
        archGeom.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
        archGeom.setIndex(indices);
        archGeom.computeVertexNormals();

        return (
          <group
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
            {/* CARVED EDGE — a slightly larger arch sitting just BEHIND the
                portal (pulled inward toward the trunk axis). Deep amber-black
                emissive only, no shadows, so it reads as a recessed bark lip
                framing the doorway. */}
            <mesh
              geometry={archGeom}
              scale={[1.07, 1.05, 1.07]}
              position={[0, 0, -0.04]}
            >
              <meshBasicMaterial
                color="#1a0a04"
                toneMapped={false}
                side={THREE.DoubleSide}
              />
            </mesh>

            {/* THE DOORWAY IS THE ORB.
                A single arch-shaped emissive surface that follows the
                trunk's curvature. No frame, no protruding planes —
                it reads as a glowing portal carved INTO the bark. */}
            <mesh ref={orbCoreRef as unknown as React.Ref<THREE.Mesh>} geometry={archGeom}>
              <meshBasicMaterial
                color="#fff2c2"
                toneMapped={false}
                side={THREE.DoubleSide}
              />
            </mesh>

            {/* Soft warm bloom-catcher just outside the arch surface */}
            <mesh geometry={archGeom} scale={[1.04, 1.04, 1.04]}>
              <meshBasicMaterial
                ref={orbGlowRef}
                color="#ffb96a"
                transparent
                opacity={0.55}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
                toneMapped={false}
                side={THREE.DoubleSide}
              />
            </mesh>

            {/* Outer soft halo bleeding onto surrounding bark */}
            <mesh ref={orbHaloRef} geometry={archGeom} scale={[1.18, 1.12, 1.18]}>
              <meshBasicMaterial
                color="#ff9a3a"
                transparent
                opacity={0.22}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
                toneMapped={false}
                side={THREE.DoubleSide}
              />
            </mesh>

            {/* Warm fill light bleeding from the portal onto bark */}
            <pointLight
              ref={orbLightRef}
              position={[0, DOORWAY_Y_CENTER, trunkR + 0.5]}
              intensity={2.6}
              color="#ffa040"
              distance={10}
              decay={2}
            />
          </group>
        );
      })()}
    </group>
  );
}
