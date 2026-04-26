import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html, Text } from "@react-three/drei";
import * as THREE from "three";

/**
 * Gritty concrete warehouse "treelink" room.
 *
 * The user sits in the center of a square concrete chamber and can drag/auto-rotate
 * a full 360° to see each wall. Each of the four walls hosts a platform embed
 * styled like a graffiti tag (Discord, Spotify, YouTube, TikTok, Instagram, +More
 * are distributed across walls). The room is dressed with environmental props:
 * a wooden ladder, oil barrels, cardboard boxes, scattered debris, and tall
 * vertical pipes in the corners — all lit by buzzing fluorescent ceiling lights.
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

// Square room dimensions
const ROOM_SIZE = 16; // wall-to-wall
const HALF = ROOM_SIZE / 2;
const ROOM_HEIGHT = 7;

// Concrete wall color palette
const CONCRETE = "#9a958c";
const CONCRETE_DARK = "#3d3a34";
const FLOOR_COLOR = "#5a564f";

export default function TheaterInterior({ isMobile = false }: TheaterProps) {
  const lightRefs = useRef<THREE.PointLight[]>([]);
  const frameRefs = useRef<THREE.MeshStandardMaterial[]>([]);

  // Distribute 6 panels across 4 walls (2 walls get 2 panels, 2 walls get 1)
  // Walls are indexed 0:+Z(north), 1:+X(east), 2:-Z(south), 3:-X(west)
  const panels = useMemo(() => {
    // Layout: north(2), east(1), south(2), west(1)
    const layout = [
      { wall: 0, slot: 0, of: 2 }, // discord
      { wall: 0, slot: 1, of: 2 }, // spotify
      { wall: 1, slot: 0, of: 1 }, // youtube
      { wall: 2, slot: 0, of: 2 }, // tiktok
      { wall: 2, slot: 1, of: 2 }, // instagram
      { wall: 3, slot: 0, of: 1 }, // more
    ];

    return PLATFORMS.map((p, i) => {
      const { wall, slot, of } = layout[i];
      // horizontal offset along the wall
      const span = ROOM_SIZE - 4;
      const x = of === 1 ? 0 : -span / 2 + (slot + 0.5) * (span / of);
      const y = 3.2;
      const inset = 0.06; // sits slightly off the wall

      let position: [number, number, number];
      let rotY = 0;
      switch (wall) {
        case 0: // north (+Z), faces -Z (toward center)
          position = [x, y, HALF - inset];
          rotY = Math.PI;
          break;
        case 1: // east (+X), faces -X
          position = [HALF - inset, y, -x];
          rotY = -Math.PI / 2;
          break;
        case 2: // south (-Z), faces +Z
          position = [-x, y, -HALF + inset];
          rotY = 0;
          break;
        default: // west (-X), faces +X
          position = [-HALF + inset, y, x];
          rotY = Math.PI / 2;
          break;
      }
      return { ...p, position, rotY };
    });
  }, []);

  // Fluorescent ceiling lights — 3 long tubes
  const ceilingLights = useMemo(
    () => [
      { x: -4, z: -3 },
      { x: 0, z: 0 },
      { x: 4, z: 3 },
    ],
    []
  );

  // Scattered floor debris (small concrete chunks)
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
    // Subtle fluorescent flicker
    lightRefs.current.forEach((l, i) => {
      if (!l) return;
      const flick = Math.sin(t * 30 + i * 1.7) > 0.97 ? 0.55 : 1;
      l.intensity = (0.85 + Math.sin(t * 0.4 + i) * 0.05) * flick;
    });
    frameRefs.current.forEach((mat, i) => {
      if (!mat) return;
      const pulse = 0.5 + Math.sin(t * 0.6 + i * 0.8) * 0.5;
      mat.emissiveIntensity = 0.3 + pulse * 0.4;
    });
  });

  // Embed panel size
  const PANEL_W = 4.4;
  const PANEL_H = 2.9;
  const iframeW = isMobile ? 520 : 640;
  const iframeH = isMobile ? 360 : 420;

  // Helper: a vertical pipe column
  const Pipe = ({ position }: { position: [number, number, number] }) => (
    <group position={position}>
      <mesh castShadow>
        <cylinderGeometry args={[0.22, 0.22, ROOM_HEIGHT, 16]} />
        <meshStandardMaterial color="#6b5a3a" roughness={0.8} metalness={0.4} />
      </mesh>
      <mesh position={[0.28, 0, 0]}>
        <cylinderGeometry args={[0.18, 0.18, ROOM_HEIGHT, 16]} />
        <meshStandardMaterial color="#7a6840" roughness={0.75} metalness={0.45} />
      </mesh>
    </group>
  );

  // Helper: an oil barrel
  const Barrel = ({
    position,
    color = "#3a5d4a",
  }: {
    position: [number, number, number];
    color?: string;
  }) => (
    <group position={position}>
      <mesh castShadow>
        <cylinderGeometry args={[0.55, 0.55, 1.3, 24]} />
        <meshStandardMaterial color={color} roughness={0.7} metalness={0.5} />
      </mesh>
      {/* rim rings */}
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

  // Helper: cardboard box
  const Box = ({
    position,
    rotation = 0,
    size = [0.9, 0.9, 0.9] as [number, number, number],
  }: {
    position: [number, number, number];
    rotation?: number;
    size?: [number, number, number];
  }) => (
    <mesh position={position} rotation={[0, rotation, 0]} castShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color="#a47844" roughness={0.95} />
    </mesh>
  );

  // Helper: A-frame ladder
  const Ladder = ({
    position,
    rotation = 0,
  }: {
    position: [number, number, number];
    rotation?: number;
  }) => (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Left rail */}
      <mesh position={[-0.35, 1.2, 0]} rotation={[0, 0, 0.12]}>
        <boxGeometry args={[0.08, 2.6, 0.08]} />
        <meshStandardMaterial color="#c8a263" roughness={0.85} />
      </mesh>
      {/* Right rail */}
      <mesh position={[0.35, 1.2, 0]} rotation={[0, 0, -0.12]}>
        <boxGeometry args={[0.08, 2.6, 0.08]} />
        <meshStandardMaterial color="#c8a263" roughness={0.85} />
      </mesh>
      {/* Rungs */}
      {[0.3, 0.8, 1.3, 1.8].map((y, i) => (
        <mesh key={i} position={[0, y, 0]}>
          <boxGeometry args={[0.7, 0.06, 0.06]} />
          <meshStandardMaterial color="#b08b50" roughness={0.85} />
        </mesh>
      ))}
    </group>
  );

  return (
    <group>
      {/* ---------- Floor: stained concrete ---------- */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
        <planeGeometry args={[ROOM_SIZE, ROOM_SIZE]} />
        <meshStandardMaterial color={FLOOR_COLOR} roughness={0.95} metalness={0.05} />
      </mesh>
      {/* Dark stained baseboard ring (painted lower portion of walls) */}
      {[0, 1, 2, 3].map((wall) => {
        const isNS = wall === 0 || wall === 2;
        const z = wall === 0 ? HALF - 0.02 : wall === 2 ? -HALF + 0.02 : 0;
        const x = wall === 1 ? HALF - 0.02 : wall === 3 ? -HALF + 0.02 : 0;
        const rotY = isNS ? 0 : Math.PI / 2;
        return (
          <mesh
            key={`base-${wall}`}
            position={[x, -0.05, z]}
            rotation={[0, rotY, 0]}
          >
            <planeGeometry args={[ROOM_SIZE, 0.9]} />
            <meshStandardMaterial
              color="#2a3530"
              roughness={1}
              side={THREE.DoubleSide}
            />
          </mesh>
        );
      })}

      {/* ---------- Four concrete walls ---------- */}
      {/* North (+Z) */}
      <mesh position={[0, ROOM_HEIGHT / 2 - 0.5, HALF]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[ROOM_SIZE, ROOM_HEIGHT]} />
        <meshStandardMaterial color={CONCRETE} roughness={0.95} side={THREE.FrontSide} />
      </mesh>
      {/* South (-Z) */}
      <mesh position={[0, ROOM_HEIGHT / 2 - 0.5, -HALF]}>
        <planeGeometry args={[ROOM_SIZE, ROOM_HEIGHT]} />
        <meshStandardMaterial color={CONCRETE} roughness={0.95} />
      </mesh>
      {/* East (+X) */}
      <mesh position={[HALF, ROOM_HEIGHT / 2 - 0.5, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[ROOM_SIZE, ROOM_HEIGHT]} />
        <meshStandardMaterial color={CONCRETE} roughness={0.95} />
      </mesh>
      {/* West (-X) */}
      <mesh position={[-HALF, ROOM_HEIGHT / 2 - 0.5, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[ROOM_SIZE, ROOM_HEIGHT]} />
        <meshStandardMaterial color={CONCRETE} roughness={0.95} />
      </mesh>

      {/* ---------- Ceiling ---------- */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, ROOM_HEIGHT - 0.5, 0]}>
        <planeGeometry args={[ROOM_SIZE, ROOM_SIZE]} />
        <meshStandardMaterial color={CONCRETE_DARK} roughness={0.95} />
      </mesh>

      {/* ---------- Fluorescent ceiling tubes ---------- */}
      {ceilingLights.map((l, i) => (
        <group key={`light-${i}`} position={[l.x, ROOM_HEIGHT - 0.55, l.z]}>
          {/* Fixture housing */}
          <mesh>
            <boxGeometry args={[2.2, 0.08, 0.45]} />
            <meshStandardMaterial color="#1d1d1d" roughness={0.7} />
          </mesh>
          {/* Glowing tube */}
          <mesh position={[0, -0.05, 0]}>
            <boxGeometry args={[2.0, 0.05, 0.25]} />
            <meshBasicMaterial color="#f4f8ff" toneMapped={false} />
          </mesh>
          <pointLight
            ref={(el) => {
              if (el) lightRefs.current[i] = el;
            }}
            position={[0, -0.3, 0]}
            color="#dbeaff"
            intensity={0.9}
            distance={14}
            decay={1.6}
          />
        </group>
      ))}

      {/* ---------- Vertical pipes in corners ---------- */}
      <Pipe position={[HALF - 0.6, ROOM_HEIGHT / 2 - 0.5, HALF - 0.6]} />
      <Pipe position={[-HALF + 0.6, ROOM_HEIGHT / 2 - 0.5, HALF - 0.6]} />
      <Pipe position={[HALF - 0.6, ROOM_HEIGHT / 2 - 0.5, -HALF + 0.6]} />
      <Pipe position={[-HALF + 0.6, ROOM_HEIGHT / 2 - 0.5, -HALF + 0.6]} />

      {/* ---------- Environmental props (against walls) ---------- */}
      {/* Ladder against north wall */}
      <Ladder position={[-3.2, -0.5, HALF - 0.8]} rotation={-0.2} />

      {/* Barrels stacked near east wall */}
      <Barrel position={[HALF - 1.2, 0.15, 2.5]} color="#3a5d4a" />
      <Barrel position={[HALF - 1.2, 0.15, 4]} color="#4a3a2a" />
      <Barrel position={[HALF - 2.4, 0.15, 3.2]} color="#3a5d4a" />

      {/* Cardboard box pile near south-east */}
      <Box position={[HALF - 1.5, 0, -3]} rotation={0.3} size={[1.1, 1, 1.1]} />
      <Box position={[HALF - 2.6, 0, -3.4]} rotation={-0.2} size={[0.8, 0.8, 0.8]} />
      <Box position={[HALF - 1.8, 1.05, -3.2]} rotation={0.5} size={[0.7, 0.7, 0.7]} />

      {/* Lone box near west wall */}
      <Box position={[-HALF + 1.6, 0, -1.5]} rotation={-0.4} size={[0.95, 0.95, 0.95]} />
      <Box position={[-HALF + 1.4, 0, 3]} rotation={0.2} size={[1.1, 0.9, 1.0]} />

      {/* Scattered debris on the floor */}
      {debris.map((d, i) => (
        <mesh key={`debris-${i}`} position={d.pos} rotation={[0, d.rot, 0]} castShadow>
          <boxGeometry args={[d.scale, d.scale * 0.5, d.scale]} />
          <meshStandardMaterial color="#3a3833" roughness={1} />
        </mesh>
      ))}

      {/* ---------- Platform graffiti panels ---------- */}
      {panels.map((panel, i) => (
        <group key={panel.id} position={panel.position} rotation={[0, panel.rotY, 0]}>
          {/* Spray-paint halo backing */}
          <mesh position={[0, 0, -0.04]}>
            <planeGeometry args={[PANEL_W + 1.4, PANEL_H + 1.6]} />
            <meshBasicMaterial
              color={panel.color}
              transparent
              opacity={0.12}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>

          {/* Painted "tag" frame on the wall */}
          <mesh position={[0, 0, -0.02]}>
            <planeGeometry args={[PANEL_W + 0.5, PANEL_H + 0.7]} />
            <meshStandardMaterial
              ref={(el) => {
                if (el) frameRefs.current[i] = el;
              }}
              color="#1a1a1a"
              emissive={panel.color}
              emissiveIntensity={0.35}
              roughness={0.9}
              transparent
              opacity={0.9}
              toneMapped={false}
            />
          </mesh>

          {/* Graffiti-style label above */}
          <Text
            position={[0, PANEL_H / 2 + 0.32, 0.02]}
            fontSize={0.28}
            color={panel.color}
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.012}
            outlineColor="#000000"
          >
            {panel.label}
          </Text>

          {/* Embed iframe or placeholder */}
          {panel.src ? (
            <Html
              position={[0, 0, 0.02]}
              transform
              occlude={false}
              distanceFactor={2.4}
              style={{
                width: `${iframeW}px`,
                height: `${iframeH}px`,
                borderRadius: "4px",
                overflow: "hidden",
                boxShadow: `0 0 60px ${panel.color}66, 0 0 20px ${panel.color}55 inset`,
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
                borderRadius: "4px",
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background:
                  "linear-gradient(135deg, rgba(20,20,20,0.92), rgba(40,40,40,0.92))",
                color: panel.color,
                fontFamily: "system-ui, sans-serif",
                fontSize: "28px",
                letterSpacing: "0.15em",
                textAlign: "center",
                boxShadow: `0 0 60px ${panel.color}55, 0 0 20px ${panel.color}55 inset`,
              }}
            >
              <div style={{ padding: "24px" }}>
                <div
                  style={{
                    fontSize: "14px",
                    opacity: 0.7,
                    marginBottom: 12,
                    color: "#ccc",
                  }}
                >
                  COMING SOON
                </div>
                <div>{panel.label}</div>
              </div>
            </Html>
          )}
        </group>
      ))}

      {/* ---------- Ambient lighting ---------- */}
      <ambientLight intensity={0.35} color="#9aa6b0" />
      <hemisphereLight args={["#cdd6e0", "#2a2620", 0.3]} />
    </group>
  );
}
