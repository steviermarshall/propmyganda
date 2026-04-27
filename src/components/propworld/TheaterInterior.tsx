import { useEffect, useMemo, useRef } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import { Html, Text } from "@react-three/drei";
import * as THREE from "three";

import concreteWallUrl from "@/assets/concrete-wall.jpg";
import concreteFloorUrl from "@/assets/concrete-floor.jpg";
import ceilingWoodUrl from "@/assets/ceiling-wood.jpg";
import graffitiBronxUrl from "@/assets/graffiti-bronx.png";
import graffitiQueensUrl from "@/assets/graffiti-queens.png";
import graffitiNycUrl from "@/assets/graffiti-nyc.png";
import graffitiBrooklynUrl from "@/assets/graffiti-brooklyn.png";
import { kickables, type Kickable } from "./useKickables";
import CosmicEnvironment, { ImpactBursts } from "./CosmicEnvironment";

const ROOM_BOUND = 7.5; // wall half-size used by KickableProp collisions (room is 16 wide)
const ROOM_HEIGHT_PIPE = 7;

// ---- Reusable prop components (module scope so each instance is independent) ----
const Pipe = ({ position }: { position: [number, number, number] }) => (
  <group position={position}>
    <mesh castShadow>
      <cylinderGeometry args={[0.22, 0.22, ROOM_HEIGHT_PIPE, 16]} />
      <meshStandardMaterial color="#7a6840" roughness={0.85} metalness={0.4} />
    </mesh>
    <mesh position={[0.32, 0, 0]} castShadow>
      <cylinderGeometry args={[0.18, 0.18, ROOM_HEIGHT_PIPE, 16]} />
      <meshStandardMaterial color="#8a7548" roughness={0.8} metalness={0.45} />
    </mesh>
  </group>
);

const Barrel = ({ color = "#3a5d4a" }: { color?: string }) => (
  <group>
    <mesh castShadow>
      <cylinderGeometry args={[0.55, 0.55, 1.3, 24]} />
      <meshStandardMaterial color={color} roughness={0.75} metalness={0.45} />
    </mesh>
    <mesh position={[0, 0.5, 0]}>
      <torusGeometry args={[0.56, 0.04, 8, 24]} />
      <meshStandardMaterial color="#2a3f33" roughness={0.6} metalness={0.6} />
    </mesh>
    <mesh position={[0, -0.5, 0]}>
      <torusGeometry args={[0.56, 0.04, 8, 24]} />
      <meshStandardMaterial color="#2a3f33" roughness={0.6} metalness={0.6} />
    </mesh>
  </group>
);

const Box = ({
  size = [0.9, 0.9, 0.9] as [number, number, number],
}: {
  size?: [number, number, number];
}) => (
  <mesh castShadow>
    <boxGeometry args={size} />
    <meshStandardMaterial color="#a47844" roughness={0.95} />
  </mesh>
);

const Ladder = ({
  position,
  rotation = 0,
}: {
  position: [number, number, number];
  rotation?: number;
}) => (
  <group position={position} rotation={[0, rotation, 0]}>
    <mesh position={[-0.35, 1.2, 0]} rotation={[0, 0, 0.12]}>
      <boxGeometry args={[0.08, 2.6, 0.08]} />
      <meshStandardMaterial color="#c8a263" roughness={0.85} />
    </mesh>
    <mesh position={[0.35, 1.2, 0]} rotation={[0, 0, -0.12]}>
      <boxGeometry args={[0.08, 2.6, 0.08]} />
      <meshStandardMaterial color="#c8a263" roughness={0.85} />
    </mesh>
    {[0.3, 0.8, 1.3, 1.8].map((y, i) => (
      <mesh key={i} position={[0, y, 0]}>
        <boxGeometry args={[0.7, 0.06, 0.06]} />
        <meshStandardMaterial color="#b08b50" roughness={0.85} />
      </mesh>
    ))}
  </group>
);

const Chair = () => (
  <group>
    <mesh position={[0, 0.45, 0]} castShadow>
      <boxGeometry args={[0.55, 0.08, 0.55]} />
      <meshStandardMaterial color="#6b4a2a" roughness={0.9} />
    </mesh>
    <mesh position={[0, 0.85, -0.23]} castShadow>
      <boxGeometry args={[0.55, 0.7, 0.07]} />
      <meshStandardMaterial color="#6b4a2a" roughness={0.9} />
    </mesh>
    {[
      [-0.22, 0.22, -0.22],
      [0.22, 0.22, -0.22],
      [-0.22, 0.22, 0.22],
      [0.22, 0.22, 0.22],
    ].map((p, i) => (
      <mesh key={i} position={p as [number, number, number]} castShadow>
        <boxGeometry args={[0.06, 0.45, 0.06]} />
        <meshStandardMaterial color="#5a3f24" roughness={0.9} />
      </mesh>
    ))}
  </group>
);

/**
 * GraffitiDecals — places one randomized graffiti tag on each of the 4 walls.
 * Position, scale and rotation re-roll on every mount (page load).
 * Safe zones avoid the picture frames which are centered on each wall at
 * y≈2.6 and span ~4.2 wide x ~2.6 tall.
 */
function GraffitiDecals({
  textures,
  roomHalf,
}: {
  textures: THREE.Texture[];
  roomHalf: number;
}) {
  const placements = useMemo(() => {
    const rng = () => Math.random();
    const pickSafe = () => {
      // "low" band (under frames) or "side" band (beside frames)
      if (rng() < 0.55) {
        return { x: (rng() - 0.5) * 10, y: -0.2 + rng() * 1.2 };
      }
      const sign = rng() < 0.5 ? -1 : 1;
      return { x: sign * (3.6 + rng() * 2.0), y: rng() * 4.2 };
    };

    const tex = [...textures].sort(() => Math.random() - 0.5);

    const walls = [
      { pos: (x: number, y: number) => [x, y, roomHalf - 0.02] as [number, number, number], rotY: Math.PI },
      { pos: (x: number, y: number) => [-x, y, -roomHalf + 0.02] as [number, number, number], rotY: 0 },
      { pos: (x: number, y: number) => [roomHalf - 0.02, y, -x] as [number, number, number], rotY: -Math.PI / 2 },
      { pos: (x: number, y: number) => [-roomHalf + 0.02, y, x] as [number, number, number], rotY: Math.PI / 2 },
    ];

    return walls.map((w, i) => {
      const { x, y } = pickSafe();
      const scale = 0.85 + rng() * 0.5;
      const width = 4.4 * scale;
      const height = width * 0.5;
      const tilt = (rng() - 0.5) * 0.18;
      return {
        key: i,
        position: w.pos(x, y),
        rotation: [0, w.rotY, tilt] as [number, number, number],
        size: [width, height] as [number, number],
        texture: tex[i % tex.length],
        offset: -1 - i * 0.5,
      };
    });
  }, [textures, roomHalf]);

  return (
    <group>
      {placements.map((p) => (
        <mesh key={p.key} position={p.position} rotation={p.rotation}>
          <planeGeometry args={p.size} />
          <meshStandardMaterial
            map={p.texture}
            transparent
            alphaTest={0.05}
            roughness={1}
            depthWrite={false}
            polygonOffset
            polygonOffsetFactor={p.offset}
          />
        </mesh>
      ))}
    </group>
  );
}


/**
 * KickableProp — wraps any 3D content and makes it physically kickable.
 * Registers with the kickables singleton; runs simple gravity + wall collision physics.
 */
function KickableProp({
  id,
  initialPosition,
  initialRotationY = 0,
  radius,
  mass = 1,
  groundY,
  children,
}: {
  id: string;
  initialPosition: [number, number, number];
  initialRotationY?: number;
  radius: number;
  mass?: number;
  groundY: number;
  children: React.ReactNode;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const stateRef = useRef<Kickable>({
    id,
    position: new THREE.Vector3(...initialPosition),
    velocity: new THREE.Vector3(0, 0, 0),
    angularY: 0,
    rotationY: initialRotationY,
    radius,
    groundY,
    mass,
  });

  useEffect(() => {
    const s = stateRef.current;
    kickables.register(s);
    return () => kickables.unregister(id);
  }, [id]);

  useFrame((_, delta) => {
    const s = stateRef.current;
    const dt = Math.min(delta, 0.05);

    if (s.position.y > s.groundY + 0.001 || s.velocity.y > 0) {
      s.velocity.y -= 18 * dt;
    }

    s.position.x += s.velocity.x * dt;
    s.position.y += s.velocity.y * dt;
    s.position.z += s.velocity.z * dt;
    s.rotationY += s.angularY * dt;

    if (s.position.y < s.groundY) {
      s.position.y = s.groundY;
      if (s.velocity.y < 0) s.velocity.y = -s.velocity.y * 0.25;
      if (Math.abs(s.velocity.y) < 0.4) s.velocity.y = 0;
      s.velocity.x *= Math.pow(0.02, dt);
      s.velocity.z *= Math.pow(0.02, dt);
      s.angularY *= Math.pow(0.05, dt);
    } else {
      s.velocity.x *= Math.pow(0.6, dt);
      s.velocity.z *= Math.pow(0.6, dt);
    }

    const limit = ROOM_BOUND - s.radius;
    if (s.position.x > limit) {
      s.position.x = limit;
      s.velocity.x = -s.velocity.x * 0.4;
    } else if (s.position.x < -limit) {
      s.position.x = -limit;
      s.velocity.x = -s.velocity.x * 0.4;
    }
    if (s.position.z > limit) {
      s.position.z = limit;
      s.velocity.z = -s.velocity.z * 0.4;
    } else if (s.position.z < -limit) {
      s.position.z = -limit;
      s.velocity.z = -s.velocity.z * 0.4;
    }

    if (s.velocity.lengthSq() < 0.0004) s.velocity.set(0, 0, 0);
    if (Math.abs(s.angularY) < 0.02) s.angularY = 0;

    if (groupRef.current) {
      groupRef.current.position.copy(s.position);
      groupRef.current.rotation.y = s.rotationY;
    }
  });

  return (
    <group
      ref={groupRef}
      onPointerDown={(e) => {
        // Direct tap on this prop — instant kick away from the camera
        e.stopPropagation();
        kickables.kickById(id, e.camera.position.clone());
      }}
    >
      {children}
    </group>
  );
}

/**
 * Gritty Max-Payne-style concrete warehouse "treelink" room.
 *
 * - Walls/floor/ceiling use real photographic textures (seamless tiles)
 * - Single buzzing fluorescent ceiling light = moody, low-key lighting
 * - Each platform embed sits inside a slanted wooden picture frame against the wall
 * - Camera (CameraRig) auto-rotates + drag for a full 360° look around
 */
interface TheaterProps {
  isMobile?: boolean;
}

type Platform = {
  id: string;
  label: string;
  src: string | null;
  color: string;
  cta?: { label: string; url: string };
};

const PLATFORMS: Platform[] = [
  {
    id: "discord",
    label: "DISCORD",
    src: "https://discord.com/widget?id=1011591077406572574&theme=dark",
    color: "#5865F2",
    cta: { label: "JOIN SERVER", url: "https://discord.gg/RADeWseEq" },
  },
  {
    id: "spotify",
    label: "SPOTIFY",
    src: "https://open.spotify.com/embed/album/1QpBtjtvqnhKEBy4xcjn44?utm_source=generator&theme=0",
    color: "#1DB954",
    cta: {
      label: "OPEN IN SPOTIFY",
      url: "https://open.spotify.com/album/1QpBtjtvqnhKEBy4xcjn44",
    },
  },
  {
    id: "youtube",
    label: "YOUTUBE",
    src: "https://www.youtube.com/embed/xq6BOsXTWSI",
    color: "#FF0033",
    cta: {
      label: "SUBSCRIBE",
      url: "https://youtube.com/@propmyganda?sub_confirmation=1",
    },
  },
  {
    id: "tiktok",
    label: "TIKTOK",
    // PLACEHOLDER: replace with your rss.app TikTok feed iframe URL
    // (e.g. https://rss.app/embed/v1/wall/XXXXXXX)
    src: "https://rss.app/embed/v1/wall/tQ8x5vYK1cR9ZpAo",
    color: "#FF2D55",
    cta: { label: "FOLLOW ON TIKTOK", url: "https://www.tiktok.com/@propmyganda" },
  },
  {
    id: "instagram",
    label: "INSTAGRAM",
    src: null,
    color: "#E1306C",
    cta: {
      label: "FOLLOW @PROPMYGANDA_",
      url: "https://www.instagram.com/propmyganda_/",
    },
  },
  { id: "more", label: "+ MORE SOON", src: null, color: "#ffc870" },
];

const ROOM_SIZE = 16;
const HALF = ROOM_SIZE / 2;
const ROOM_HEIGHT = 7;

export default function TheaterInterior({ isMobile = false }: TheaterProps) {
  // Load and configure tileable textures
  const [wallTex, floorTex, ceilingTex, gBronx, gQueens, gNyc, gBrooklyn] = useLoader(
    THREE.TextureLoader,
    [
      concreteWallUrl,
      concreteFloorUrl,
      ceilingWoodUrl,
      graffitiBronxUrl,
      graffitiQueensUrl,
      graffitiNycUrl,
      graffitiBrooklynUrl,
    ],
  );

  useMemo(() => {
    [wallTex, floorTex, ceilingTex].forEach((t) => {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.anisotropy = 8;
      // sRGB so colors don't look washed out
      t.colorSpace = THREE.SRGBColorSpace;
    });
    [gBronx, gQueens, gNyc, gBrooklyn].forEach((t) => {
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 8;
    });
    wallTex.repeat.set(2, 1);
    floorTex.repeat.set(3, 3);
    ceilingTex.repeat.set(3, 3);
  }, [wallTex, floorTex, ceilingTex, gBronx, gQueens, gNyc, gBrooklyn]);

  // Wood texture for picture frames (reuse ceiling wood, smaller repeat)
  const frameWoodTex = useMemo(() => {
    const t = ceilingTex.clone();
    t.repeat.set(1, 1);
    t.needsUpdate = true;
    return t;
  }, [ceilingTex]);

  const flickerLightRef = useRef<THREE.PointLight>(null);
  const tubeMatRef = useRef<THREE.MeshBasicMaterial>(null);

  // Distribute 6 panels across 4 walls: N(2), E(1), S(2), W(1)
  const panels = useMemo(() => {
    const layout = [
      { wall: 0, slot: 0, of: 2 },
      { wall: 0, slot: 1, of: 2 },
      { wall: 1, slot: 0, of: 1 },
      { wall: 2, slot: 0, of: 2 },
      { wall: 2, slot: 1, of: 2 },
      { wall: 3, slot: 0, of: 1 },
    ];

    return PLATFORMS.map((p, i) => {
      const { wall, slot, of } = layout[i];
      const span = ROOM_SIZE - 4;
      const x = of === 1 ? 0 : -span / 2 + (slot + 0.5) * (span / of);
      const y = 2.6;
      const inset = 0.18;

      let position: [number, number, number];
      let rotY = 0;
      switch (wall) {
        case 0:
          position = [x, y, HALF - inset];
          rotY = Math.PI;
          break;
        case 1:
          position = [HALF - inset, y, -x];
          rotY = -Math.PI / 2;
          break;
        case 2:
          position = [-x, y, -HALF + inset];
          rotY = 0;
          break;
        default:
          position = [-HALF + inset, y, x];
          rotY = Math.PI / 2;
          break;
      }
      // Slight tilt: alternating slants so frames look casually hung
      const tilt = ((i % 2) * 2 - 1) * 0.06;
      return { ...p, position, rotY, tilt };
    });
  }, []);

  // Floor debris
  const debris = useMemo(() => {
    const arr: { pos: [number, number, number]; rot: number; scale: number }[] = [];
    const rng = (n: number) => {
      const v = Math.sin(n * 9173.13) * 43758.5453;
      return v - Math.floor(v);
    };
    for (let i = 0; i < 14; i++) {
      const x = (rng(i) - 0.5) * (ROOM_SIZE - 4);
      const z = (rng(i + 99) - 0.5) * (ROOM_SIZE - 4);
      arr.push({
        pos: [x, -0.42, z],
        rot: rng(i + 50) * Math.PI * 2,
        scale: 0.08 + rng(i + 200) * 0.14,
      });
    }
    return arr;
  }, []);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    // Subtle fluorescent flicker on the single overhead light
    const flick = Math.sin(t * 33) > 0.985 ? 0.55 : 1;
    if (flickerLightRef.current) {
      flickerLightRef.current.intensity =
        (2.4 + Math.sin(t * 0.5) * 0.1) * flick;
    }
    if (tubeMatRef.current) {
      tubeMatRef.current.opacity = flick > 0.5 ? 1 : 0.5;
    }
  });

  const PANEL_W = 4.2;
  const PANEL_H = 2.6;
  // Render iframe at a fixed 16:9 pixel size, then scale-to-fit the panel via
  // <Html transform> so it stays readable and properly framed on any device.
  // The pixel resolution is constant -> sharp text and consistent UI controls.
  const IFRAME_BASE_W = 960;
  const IFRAME_BASE_H = 540; // 16:9
  // World-space target: fit width of frame, keep 16:9
  const PANEL_INNER_W = PANEL_W - 0.2;
  const PANEL_INNER_H = PANEL_INNER_W * (9 / 16);
  // Drei Html transform maps CSS pixels through its default distance factor:
  // 1 CSS px ≈ 10 / 400 world units before the group's scale is applied.
  // Include that ratio so a 960px iframe fills the frame instead of rendering
  // as a tiny, unreadable speck.
  const HTML_WORLD_UNITS_PER_PIXEL = 10 / 400;
  const htmlScale = PANEL_INNER_W / (IFRAME_BASE_W * HTML_WORLD_UNITS_PER_PIXEL);

  // (Prop components Pipe, Barrel, Box, Ladder, Chair are defined at module scope below)

  // Simple wooden folding-style chair (centered at base of seat)
  const Chair = () => (
    <group>
      {/* Seat */}
      <mesh position={[0, 0.45, 0]} castShadow>
        <boxGeometry args={[0.55, 0.08, 0.55]} />
        <meshStandardMaterial color="#6b4a2a" roughness={0.9} />
      </mesh>
      {/* Backrest */}
      <mesh position={[0, 0.85, -0.23]} castShadow>
        <boxGeometry args={[0.55, 0.7, 0.07]} />
        <meshStandardMaterial color="#6b4a2a" roughness={0.9} />
      </mesh>
      {/* 4 legs */}
      {[
        [-0.22, 0.22, -0.22],
        [0.22, 0.22, -0.22],
        [-0.22, 0.22, 0.22],
        [0.22, 0.22, 0.22],
      ].map((p, i) => (
        <mesh key={i} position={p as [number, number, number]} castShadow>
          <boxGeometry args={[0.06, 0.45, 0.06]} />
          <meshStandardMaterial color="#5a3f24" roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
  const PictureFrame = ({
    width,
    height,
    children,
  }: {
    width: number;
    height: number;
    children?: React.ReactNode;
  }) => {
    // Ornate baroque gold frame — layered moldings + carved scroll corners
    const outer = 0.55; // outer molding width
    const inner = 0.18; // inner bevel width
    const depthOuter = 0.18;
    const depthInner = 0.08;

    // Carved/painted wood materials — textured, non-metallic so embeds remain readable
    const goldOuter = (
      <meshStandardMaterial
        map={frameWoodTex}
        color="#a87a3a"
        roughness={0.85}
        metalness={0.05}
      />
    );
    const goldHighlight = (
      <meshStandardMaterial
        map={frameWoodTex}
        color="#c89a52"
        roughness={0.7}
        metalness={0.08}
      />
    );
    const goldShadow = (
      <meshStandardMaterial
        color="#3a2614"
        roughness={0.95}
        metalness={0}
      />
    );

    // Carved scrollwork cluster placed at each corner
    const Scroll = ({ flipX = 1, flipY = 1 }: { flipX?: number; flipY?: number }) => (
      <group scale={[flipX, flipY, 1]}>
        {/* Main acanthus curl — torus segment */}
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.04]} castShadow>
          <torusGeometry args={[0.18, 0.07, 10, 16, Math.PI * 1.1]} />
          {goldHighlight}
        </mesh>
        {/* Secondary smaller curl */}
        <mesh rotation={[Math.PI / 2, 0, Math.PI / 3]} position={[0.12, 0.12, 0.06]} castShadow>
          <torusGeometry args={[0.09, 0.045, 8, 12, Math.PI * 1.3]} />
          {goldHighlight}
        </mesh>
        {/* Leaf bump */}
        <mesh position={[0.05, 0.05, 0.08]} castShadow>
          <sphereGeometry args={[0.09, 12, 10]} />
          {goldOuter}
        </mesh>
        {/* Tiny stud */}
        <mesh position={[-0.05, -0.05, 0.1]}>
          <sphereGeometry args={[0.04, 8, 8]} />
          {goldHighlight}
        </mesh>
      </group>
    );

    // A repeating ornament along an edge
    const EdgeOrnaments = ({
      length,
      vertical = false,
    }: {
      length: number;
      vertical?: boolean;
    }) => {
      const count = Math.max(2, Math.floor(length / 0.55));
      const step = length / (count + 1);
      const items = Array.from({ length: count }, (_, i) => {
        const p = -length / 2 + step * (i + 1);
        const pos: [number, number, number] = vertical ? [0, p, 0.05] : [p, 0, 0.05];
        return (
          <mesh key={i} position={pos} castShadow>
            <sphereGeometry args={[0.05, 10, 8]} />
            {goldHighlight}
          </mesh>
        );
      });
      return <group>{items}</group>;
    };

    const W = width;
    const H = height;

    return (
      <group>
        {/* Backing board (dark canvas behind artwork) */}
        <mesh position={[0, 0, -0.01]}>
          <planeGeometry args={[W, H]} />
          <meshStandardMaterial color="#1a0f08" roughness={0.95} />
        </mesh>

        {/* ---- Outer thick gold molding (with bevel via two stacked boxes) ---- */}
        {/* Top outer */}
        <mesh position={[0, H / 2 + outer / 2, 0]} castShadow>
          <boxGeometry args={[W + outer * 2, outer, depthOuter]} />
          {goldOuter}
        </mesh>
        {/* Bottom outer */}
        <mesh position={[0, -H / 2 - outer / 2, 0]} castShadow>
          <boxGeometry args={[W + outer * 2, outer, depthOuter]} />
          {goldOuter}
        </mesh>
        {/* Left outer */}
        <mesh position={[-W / 2 - outer / 2, 0, 0]} castShadow>
          <boxGeometry args={[outer, H, depthOuter]} />
          {goldOuter}
        </mesh>
        {/* Right outer */}
        <mesh position={[W / 2 + outer / 2, 0, 0]} castShadow>
          <boxGeometry args={[outer, H, depthOuter]} />
          {goldOuter}
        </mesh>

        {/* ---- Mid raised highlight ridge ---- */}
        <mesh position={[0, H / 2 + outer / 2, depthOuter / 2]}>
          <boxGeometry args={[W + outer * 2, outer * 0.35, 0.04]} />
          {goldHighlight}
        </mesh>
        <mesh position={[0, -H / 2 - outer / 2, depthOuter / 2]}>
          <boxGeometry args={[W + outer * 2, outer * 0.35, 0.04]} />
          {goldHighlight}
        </mesh>
        <mesh position={[-W / 2 - outer / 2, 0, depthOuter / 2]}>
          <boxGeometry args={[outer * 0.35, H, 0.04]} />
          {goldHighlight}
        </mesh>
        <mesh position={[W / 2 + outer / 2, 0, depthOuter / 2]}>
          <boxGeometry args={[outer * 0.35, H, 0.04]} />
          {goldHighlight}
        </mesh>

        {/* ---- Inner dark recess (creates depth between outer and image) ---- */}
        <mesh position={[0, H / 2 + inner / 2, depthInner / 2 + 0.01]}>
          <boxGeometry args={[W + inner * 2, inner, depthInner]} />
          {goldShadow}
        </mesh>
        <mesh position={[0, -H / 2 - inner / 2, depthInner / 2 + 0.01]}>
          <boxGeometry args={[W + inner * 2, inner, depthInner]} />
          {goldShadow}
        </mesh>
        <mesh position={[-W / 2 - inner / 2, 0, depthInner / 2 + 0.01]}>
          <boxGeometry args={[inner, H, depthInner]} />
          {goldShadow}
        </mesh>
        <mesh position={[W / 2 + inner / 2, 0, depthInner / 2 + 0.01]}>
          <boxGeometry args={[inner, H, depthInner]} />
          {goldShadow}
        </mesh>

        {/* ---- Repeating bead ornaments along edges ---- */}
        <group position={[0, H / 2 + outer / 2, depthOuter / 2 + 0.02]}>
          <EdgeOrnaments length={W + outer * 1.6} />
        </group>
        <group position={[0, -H / 2 - outer / 2, depthOuter / 2 + 0.02]}>
          <EdgeOrnaments length={W + outer * 1.6} />
        </group>
        <group position={[-W / 2 - outer / 2, 0, depthOuter / 2 + 0.02]}>
          <EdgeOrnaments length={H + outer * 0.4} vertical />
        </group>
        <group position={[W / 2 + outer / 2, 0, depthOuter / 2 + 0.02]}>
          <EdgeOrnaments length={H + outer * 0.4} vertical />
        </group>

        {/* ---- Carved scroll corners ---- */}
        <group position={[-W / 2 - outer / 2, H / 2 + outer / 2, depthOuter / 2]}>
          <Scroll flipX={-1} flipY={1} />
        </group>
        <group position={[W / 2 + outer / 2, H / 2 + outer / 2, depthOuter / 2]}>
          <Scroll flipX={1} flipY={1} />
        </group>
        <group position={[-W / 2 - outer / 2, -H / 2 - outer / 2, depthOuter / 2]}>
          <Scroll flipX={-1} flipY={-1} />
        </group>
        <group position={[W / 2 + outer / 2, -H / 2 - outer / 2, depthOuter / 2]}>
          <Scroll flipX={1} flipY={-1} />
        </group>

        {/* ---- Top center cartouche ornament ---- */}
        <mesh position={[0, H / 2 + outer + 0.05, depthOuter / 2]} castShadow>
          <sphereGeometry args={[0.14, 14, 10]} />
          {goldHighlight}
        </mesh>
        <mesh position={[0, H / 2 + outer + 0.05, depthOuter / 2 + 0.05]}>
          <sphereGeometry args={[0.06, 10, 8]} />
          {goldOuter}
        </mesh>

        {children}
      </group>
    );
  };

  return (
    <group>
      {/* ---------- Endless cosmic environment ---------- */}
      <CosmicEnvironment isMobile={isMobile} onHittableHover={(h) => {
        window.dispatchEvent(new CustomEvent("cosmic:hover", { detail: h }));
      }} />
      <ImpactBursts />



      {/* ---------- Slanted picture-framed embeds on each wall ---------- */}
      {panels.map((panel, i) => (
        <group
          key={panel.id}
          position={panel.position}
          rotation={[0, panel.rotY, panel.tilt]}
        >
          <PictureFrame width={PANEL_W} height={PANEL_H}>
            {/* Subtle plaque label below */}
            <mesh position={[0, -PANEL_H / 2 - 0.42, 0.02]}>
              <planeGeometry args={[1.6, 0.32]} />
              <meshStandardMaterial color="#1a1208" roughness={0.9} />
            </mesh>
            <Text
              position={[0, -PANEL_H / 2 - 0.42, 0.04]}
              fontSize={0.16}
              color={panel.color}
              anchorX="center"
              anchorY="middle"
              outlineWidth={0.006}
              outlineColor="#000"
            >
              {panel.label}
            </Text>

            {/* Follow / Subscribe CTA — sits just below the plaque, in 3D */}
            {panel.cta && (
              <Html
                position={[0, -PANEL_H / 2 - 0.78, 0.05]}
                transform
                occlude={false}
                distanceFactor={10}
                scale={htmlScale * 0.55}
                style={{
                  width: `${IFRAME_BASE_W}px`,
                  display: "flex",
                  justifyContent: "center",
                  pointerEvents: "auto",
                }}
              >
                <a
                  href={panel.cta.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "14px 28px",
                    background: panel.color,
                    color: "#0a0a0a",
                    fontFamily: "system-ui, sans-serif",
                    fontSize: "26px",
                    fontWeight: 800,
                    letterSpacing: "0.18em",
                    textDecoration: "none",
                    borderRadius: "6px",
                    border: "2px solid rgba(0,0,0,0.6)",
                    boxShadow:
                      "0 6px 18px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.25)",
                    textTransform: "uppercase",
                    whiteSpace: "nowrap",
                  }}
                >
                  {panel.cta.label}
                </a>
              </Html>
            )}

            {panel.src ? (
              <>
                {/* Dark contrast mat behind the iframe so embedded UI stays
                    readable against the textured wood frame backing. */}
                <mesh position={[0, 0, 0.14]}>
                  <planeGeometry args={[PANEL_W * 0.96, PANEL_H * 0.96]} />
                  <meshBasicMaterial color="#0a0a0a" toneMapped={false} />
                </mesh>
                <Html
                  position={[0, 0, 0.16]}
                  transform
                  occlude={false}
                  distanceFactor={10}
                  scale={htmlScale}
                  style={{
                    width: `${IFRAME_BASE_W}px`,
                    height: `${IFRAME_BASE_H}px`,
                    overflow: "hidden",
                    background: "#0a0a0a",
                    borderRadius: "6px",
                    boxShadow:
                      "0 0 0 2px rgba(255,255,255,0.08) inset, 0 0 0 1px rgba(0,0,0,0.9), 0 12px 40px rgba(0,0,0,0.7)",
                    colorScheme: "dark",
                    isolation: "isolate",
                  }}
                >
                  <iframe
                    title={panel.label}
                    src={panel.src}
                    width={IFRAME_BASE_W}
                    height={IFRAME_BASE_H}
                    frameBorder="0"
                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                    sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts allow-presentation allow-forms"
                    style={{
                      border: 0,
                      display: "block",
                      background: "#0a0a0a",
                      width: "100%",
                      height: "100%",
                      colorScheme: "dark",
                      filter: "contrast(1.05) saturate(1.05)",
                    }}
                  />
                </Html>
              </>
            ) : (
              <Html
                position={[0, 0, 0.16]}
                transform
                occlude={false}
                distanceFactor={10}
                scale={htmlScale}
                style={{
                  width: `${IFRAME_BASE_W}px`,
                  height: `${IFRAME_BASE_H}px`,
                  overflow: "hidden",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "linear-gradient(135deg, #181818, #2a2a2a)",
                  color: panel.color,
                  fontFamily: "system-ui, sans-serif",
                  fontSize: "42px",
                  letterSpacing: "0.15em",
                  textAlign: "center",
                }}
              >
                <div style={{ padding: 24 }}>
                  <div style={{ fontSize: 22, opacity: 0.7, marginBottom: 16, color: "#bbb" }}>
                    COMING SOON
                  </div>
                  <div>{panel.label}</div>
                </div>
              </Html>
            )}
          </PictureFrame>
        </group>
      ))}

      {/* ---------- Bright universe ambient lighting ---------- */}
      <ambientLight intensity={1.4} color="#ffffff" />
      <hemisphereLight args={["#ffffff", "#a8c4ff", 1.1]} />
      <directionalLight position={[6, 8, 4]} intensity={1.6} color="#ffffff" />
      <directionalLight position={[-6, -4, -3]} intensity={0.8} color="#cfe1ff" />
    </group>
  );
}

/* ---------- Endless bright universe (starfield + nebulae) ---------- */
function BrightUniverse() {
  const stars1 = useRef<THREE.Points>(null);
  const stars2 = useRef<THREE.Points>(null);

  const make = (count: number, radius: number, color: string, size: number) => {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      const r = radius * (0.6 + Math.random() * 0.4);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color,
      size,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    });
    return { geo, mat };
  };

  const near = useMemo(() => make(2200, 60, "#ffffff", 0.18), []);
  const far = useMemo(() => make(3500, 140, "#dceaff", 0.35), []);

  useFrame((_, dt) => {
    if (stars1.current) stars1.current.rotation.y += dt * 0.01;
    if (stars2.current) stars2.current.rotation.y -= dt * 0.005;
  });

  const nebulae: { p: [number, number, number]; c: string; s: number }[] = [
    { p: [40, 10, -30], c: "#ffd4f0", s: 22 },
    { p: [-50, -15, -20], c: "#bcd6ff", s: 28 },
    { p: [10, 30, -60], c: "#fff2c8", s: 32 },
    { p: [-30, 20, 40], c: "#d6c4ff", s: 24 },
    { p: [60, -10, 20], c: "#c6f0ff", s: 26 },
  ];

  return (
    <group>
      {/* Bright sky dome (inside-out sphere with soft gradient) */}
      <mesh scale={[-1, 1, 1]}>
        <sphereGeometry args={[200, 32, 32]} />
        <shaderMaterial
          side={THREE.BackSide}
          vertexShader={`
            varying vec3 vPos;
            void main() {
              vPos = normalize(position);
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `}
          fragmentShader={`
            varying vec3 vPos;
            void main() {
              float t = vPos.y * 0.5 + 0.5;
              vec3 top = vec3(0.78, 0.86, 1.00);
              vec3 mid = vec3(0.95, 0.92, 1.00);
              vec3 bot = vec3(1.00, 0.88, 0.95);
              vec3 col = mix(bot, mid, smoothstep(0.0, 0.5, t));
              col = mix(col, top, smoothstep(0.5, 1.0, t));
              gl_FragColor = vec4(col, 1.0);
            }
          `}
        />
      </mesh>

      {nebulae.map((n, i) => (
        <mesh key={i} position={n.p}>
          <sphereGeometry args={[n.s, 24, 24]} />
          <meshBasicMaterial
            color={n.c}
            transparent
            opacity={0.18}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
      ))}

      <points ref={stars1} geometry={near.geo} material={near.mat} />
      <points ref={stars2} geometry={far.geo} material={far.mat} />
    </group>
  );
}
