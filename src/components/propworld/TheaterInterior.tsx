import { useEffect, useMemo, useRef } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import { Html, Text } from "@react-three/drei";
import * as THREE from "three";

import concreteWallUrl from "@/assets/concrete-wall.jpg";
import concreteFloorUrl from "@/assets/concrete-floor.jpg";
import ceilingWoodUrl from "@/assets/ceiling-wood.jpg";
import { kickables, type Kickable } from "./useKickables";

const ROOM_BOUND = 7.5; // wall half-size used by KickableProp collisions (room is 16 wide)

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

  return <group ref={groupRef}>{children}</group>;
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
};

const PLATFORMS: Platform[] = [
  {
    id: "discord",
    label: "DISCORD",
    src: "https://discord.com/widget?id=1011591077406572574&theme=dark",
    color: "#5865F2",
  },
  {
    id: "spotify",
    label: "SPOTIFY",
    src: "https://open.spotify.com/embed/playlist/37i9dQZF1DXcBWIGoYBM5M?utm_source=generator&theme=0",
    color: "#1DB954",
  },
  {
    id: "youtube",
    label: "YOUTUBE",
    src: "https://www.youtube.com/embed/videoseries?list=PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf",
    color: "#FF0033",
  },
  { id: "tiktok", label: "TIKTOK", src: null, color: "#FF2D55" },
  { id: "instagram", label: "INSTAGRAM", src: null, color: "#E1306C" },
  { id: "more", label: "+ MORE SOON", src: null, color: "#ffc870" },
];

const ROOM_SIZE = 16;
const HALF = ROOM_SIZE / 2;
const ROOM_HEIGHT = 7;

export default function TheaterInterior({ isMobile = false }: TheaterProps) {
  // Load and configure tileable textures
  const [wallTex, floorTex, ceilingTex] = useLoader(THREE.TextureLoader, [
    concreteWallUrl,
    concreteFloorUrl,
    ceilingWoodUrl,
  ]);

  useMemo(() => {
    [wallTex, floorTex, ceilingTex].forEach((t) => {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.anisotropy = 8;
      // sRGB so colors don't look washed out
      t.colorSpace = THREE.SRGBColorSpace;
    });
    wallTex.repeat.set(2, 1);
    floorTex.repeat.set(3, 3);
    ceilingTex.repeat.set(3, 3);
  }, [wallTex, floorTex, ceilingTex]);

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
  const iframeW = isMobile ? 520 : 640;
  const iframeH = isMobile ? 360 : 420;

  // ---- Reusable prop components ----
  const Pipe = ({ position }: { position: [number, number, number] }) => (
    <group position={position}>
      <mesh castShadow>
        <cylinderGeometry args={[0.22, 0.22, ROOM_HEIGHT, 16]} />
        <meshStandardMaterial color="#7a6840" roughness={0.85} metalness={0.4} />
      </mesh>
      <mesh position={[0.32, 0, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.18, ROOM_HEIGHT, 16]} />
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

  // Slanted wooden picture frame around an embed
  const PictureFrame = ({
    width,
    height,
    children,
  }: {
    width: number;
    height: number;
    children?: React.ReactNode;
  }) => {
    const t = 0.18; // frame thickness
    const d = 0.12; // frame depth
    return (
      <group>
        {/* Backing board (dark, sits inside the frame) */}
        <mesh position={[0, 0, -0.005]}>
          <planeGeometry args={[width, height]} />
          <meshStandardMaterial color="#0a0a0a" roughness={0.95} />
        </mesh>
        {/* Top */}
        <mesh position={[0, height / 2 + t / 2, 0]} castShadow>
          <boxGeometry args={[width + t * 2, t, d]} />
          <meshStandardMaterial map={frameWoodTex} roughness={0.85} />
        </mesh>
        {/* Bottom */}
        <mesh position={[0, -height / 2 - t / 2, 0]} castShadow>
          <boxGeometry args={[width + t * 2, t, d]} />
          <meshStandardMaterial map={frameWoodTex} roughness={0.85} />
        </mesh>
        {/* Left */}
        <mesh position={[-width / 2 - t / 2, 0, 0]} castShadow>
          <boxGeometry args={[t, height, d]} />
          <meshStandardMaterial map={frameWoodTex} roughness={0.85} />
        </mesh>
        {/* Right */}
        <mesh position={[width / 2 + t / 2, 0, 0]} castShadow>
          <boxGeometry args={[t, height, d]} />
          <meshStandardMaterial map={frameWoodTex} roughness={0.85} />
        </mesh>
        {children}
      </group>
    );
  };

  return (
    <group>
      {/* ---------- Floor ---------- */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
        <planeGeometry args={[ROOM_SIZE, ROOM_SIZE]} />
        <meshStandardMaterial map={floorTex} roughness={0.95} metalness={0.05} />
      </mesh>

      {/* ---------- Four concrete walls (textured) ---------- */}
      {/* North (+Z) */}
      <mesh position={[0, ROOM_HEIGHT / 2 - 0.5, HALF]} rotation={[0, Math.PI, 0]} receiveShadow>
        <planeGeometry args={[ROOM_SIZE, ROOM_HEIGHT]} />
        <meshStandardMaterial map={wallTex} roughness={1} />
      </mesh>
      {/* South (-Z) */}
      <mesh position={[0, ROOM_HEIGHT / 2 - 0.5, -HALF]} receiveShadow>
        <planeGeometry args={[ROOM_SIZE, ROOM_HEIGHT]} />
        <meshStandardMaterial map={wallTex} roughness={1} />
      </mesh>
      {/* East (+X) */}
      <mesh position={[HALF, ROOM_HEIGHT / 2 - 0.5, 0]} rotation={[0, -Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[ROOM_SIZE, ROOM_HEIGHT]} />
        <meshStandardMaterial map={wallTex} roughness={1} />
      </mesh>
      {/* West (-X) */}
      <mesh position={[-HALF, ROOM_HEIGHT / 2 - 0.5, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[ROOM_SIZE, ROOM_HEIGHT]} />
        <meshStandardMaterial map={wallTex} roughness={1} />
      </mesh>

      {/* ---------- Ceiling (dark wood planks) ---------- */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, ROOM_HEIGHT - 0.5, 0]}>
        <planeGeometry args={[ROOM_SIZE, ROOM_SIZE]} />
        <meshStandardMaterial map={ceilingTex} roughness={0.95} />
      </mesh>

      {/* ---------- Single fluorescent ceiling tube (Max Payne style) ---------- */}
      <group position={[0, ROOM_HEIGHT - 0.55, 0]}>
        {/* Fixture housing */}
        <mesh>
          <boxGeometry args={[2.4, 0.1, 0.5]} />
          <meshStandardMaterial color="#1d1d1d" roughness={0.7} />
        </mesh>
        {/* Glowing tube */}
        <mesh position={[0, -0.06, 0]}>
          <boxGeometry args={[2.1, 0.06, 0.28]} />
          <meshBasicMaterial
            ref={tubeMatRef}
            color="#fbf6e6"
            toneMapped={false}
            transparent
            opacity={1}
          />
        </mesh>
        <pointLight
          ref={flickerLightRef}
          position={[0, -0.4, 0]}
          color="#f4ecd0"
          intensity={1.4}
          distance={20}
          decay={1.4}
          castShadow
        />
      </group>

      {/* ---------- Vertical pipes in two corners (matches reference) ---------- */}
      <Pipe position={[HALF - 0.6, ROOM_HEIGHT / 2 - 0.5, HALF - 0.6]} />
      <Pipe position={[HALF - 0.6, ROOM_HEIGHT / 2 - 0.5, -HALF + 0.6]} />

      {/* ---------- Environmental props ---------- */}
      <Ladder position={[-3.2, -0.5, HALF - 0.9]} rotation={-0.2} />

      <Barrel position={[HALF - 1.6, 0.15, 2.5]} color="#3a5d4a" />
      <Barrel position={[HALF - 1.6, 0.15, 4]} color="#4a3a2a" />
      <Barrel position={[HALF - 2.8, 0.15, 3.2]} color="#3a5d4a" />

      <Box position={[HALF - 1.8, 0, -3]} rotation={0.3} size={[1.1, 1, 1.1]} />
      <Box position={[HALF - 2.9, 0, -3.4]} rotation={-0.2} size={[0.8, 0.8, 0.8]} />
      <Box position={[HALF - 2.1, 1.05, -3.2]} rotation={0.5} size={[0.7, 0.7, 0.7]} />

      <Box position={[-HALF + 1.6, 0, -1.5]} rotation={-0.4} size={[0.95, 0.95, 0.95]} />
      <Box position={[-HALF + 1.4, 0, 3]} rotation={0.2} size={[1.1, 0.9, 1.0]} />

      {debris.map((d, i) => (
        <mesh key={`debris-${i}`} position={d.pos} rotation={[0, d.rot, 0]} castShadow>
          <boxGeometry args={[d.scale, d.scale * 0.5, d.scale]} />
          <meshStandardMaterial color="#2e2c28" roughness={1} />
        </mesh>
      ))}

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

            {panel.src ? (
              <Html
                position={[0, 0, 0.02]}
                transform
                occlude={false}
                distanceFactor={2.4}
                style={{
                  width: `${iframeW}px`,
                  height: `${iframeH}px`,
                  overflow: "hidden",
                  background: "#1a1a1a",
                }}
              >
                <iframe
                  title={panel.label}
                  src={panel.src}
                  width={iframeW}
                  height={iframeH}
                  frameBorder="0"
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts allow-presentation allow-forms"
                  style={{ border: 0, display: "block", background: "#1a1a1a" }}
                />
              </Html>
            ) : (
              <Html
                position={[0, 0, 0.02]}
                transform
                occlude={false}
                distanceFactor={2.4}
                style={{
                  width: `${iframeW}px`,
                  height: `${iframeH}px`,
                  overflow: "hidden",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "linear-gradient(135deg, #181818, #2a2a2a)",
                  color: panel.color,
                  fontFamily: "system-ui, sans-serif",
                  fontSize: "28px",
                  letterSpacing: "0.15em",
                  textAlign: "center",
                }}
              >
                <div style={{ padding: 24 }}>
                  <div style={{ fontSize: 14, opacity: 0.7, marginBottom: 12, color: "#bbb" }}>
                    COMING SOON
                  </div>
                  <div>{panel.label}</div>
                </div>
              </Html>
            )}
          </PictureFrame>
        </group>
      ))}

      {/* ---------- Ambient fill — kept low for moody contrast ---------- */}
      <ambientLight intensity={0.45} color="#a89e90" />
      <hemisphereLight args={["#d4ccba", "#2a2620", 0.4]} />
      {/* Soft fill so far walls don't fall to black */}
      <pointLight position={[0, 3, 0]} intensity={0.6} color="#e8d9b0" distance={22} decay={1.6} />
    </group>
  );
}
