import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Cylinder, Html, Text } from "@react-three/drei";
import * as THREE from "three";

/**
 * Mystical "treelink" theater inside the ancient tree.
 *
 * The user sits at the center of a fully enclosed rounded wooden chamber.
 * Around the curved walls, six platform embed panels are evenly distributed
 * so visitors can spin / drag the camera (handled in CameraRig) to discover
 * each one: Discord, Spotify, YouTube, TikTok, Instagram, and a "+ More" slot.
 *
 * Bioluminescent moss patches breathe between the panels for atmosphere
 * and feed the global Bloom pass.
 */
interface TheaterProps {
  isMobile?: boolean;
}

type Platform = {
  id: string;
  label: string;
  // null = placeholder panel (no iframe yet)
  src: string | null;
  // tint used on the panel frame glow
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
    // Placeholder Spotify embed — swap playlist/artist URI when ready
    src: "https://open.spotify.com/embed/playlist/37i9dQZF1DXcBWIGoYBM5M?utm_source=generator&theme=0",
    color: "#1DB954",
  },
  {
    id: "youtube",
    label: "YOUTUBE",
    // Placeholder channel/video — swap when ready
    src: "https://www.youtube.com/embed/videoseries?list=PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf",
    color: "#FF0033",
  },
  {
    id: "tiktok",
    label: "TIKTOK",
    src: null,
    color: "#FF2D55",
  },
  {
    id: "instagram",
    label: "INSTAGRAM",
    src: null,
    color: "#E1306C",
  },
  {
    id: "more",
    label: "+ MORE SOON",
    src: null,
    color: "#ffc870",
  },
];

const WALL_RADIUS = 8;
const PANEL_RADIUS = WALL_RADIUS - 0.15; // sits just inside the wall

export default function TheaterInterior({ isMobile = false }: TheaterProps) {
  const mossRefs = useRef<THREE.MeshStandardMaterial[]>([]);
  const frameRefs = useRef<THREE.MeshStandardMaterial[]>([]);

  // Evenly distribute panels around the full circle
  const panels = useMemo(() => {
    return PLATFORMS.map((p, i) => {
      const angle = (i / PLATFORMS.length) * Math.PI * 2;
      const x = Math.sin(angle) * PANEL_RADIUS;
      const z = Math.cos(angle) * PANEL_RADIUS;
      // Rotate panel to face the center (camera sits at origin)
      const rotY = angle + Math.PI;
      return { ...p, angle, position: [x, 3, z] as [number, number, number], rotY };
    });
  }, []);

  // Deterministic moss patch placements scattered between panels
  const mossPatches = useMemo(() => {
    const arr: {
      pos: [number, number, number];
      rot: [number, number, number];
      scale: [number, number];
      seed: number;
      hue: "teal" | "cyan" | "mint";
    }[] = [];
    const count = 28;
    const rng = (n: number) => {
      const x = Math.sin(n * 9173.13) * 43758.5453;
      return x - Math.floor(x);
    };
    for (let i = 0; i < count; i++) {
      const a = rng(i) * Math.PI * 2;
      const r = WALL_RADIUS - 0.15;
      const x = Math.sin(a) * r;
      const z = Math.cos(a) * r;
      const y = 0.6 + rng(i + 50) * 5.2;
      const w = 0.35 + rng(i + 100) * 0.6;
      const h = 0.25 + rng(i + 200) * 0.45;
      const hueRoll = rng(i + 300);
      arr.push({
        pos: [x, y, z],
        rot: [0, a + Math.PI, 0],
        scale: [w, h],
        seed: rng(i + 400) * Math.PI * 2,
        hue: hueRoll < 0.4 ? "teal" : hueRoll < 0.75 ? "cyan" : "mint",
      });
    }
    return arr;
  }, []);

  const mossColor = (hue: "teal" | "cyan" | "mint") =>
    hue === "teal" ? "#3affc4" : hue === "cyan" ? "#5bd9ff" : "#aaffd6";

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    mossRefs.current.forEach((mat, i) => {
      if (!mat) return;
      const seed = mossPatches[i]?.seed ?? 0;
      const pulse = 0.5 + Math.sin(t * 0.7 + seed) * 0.5;
      mat.emissiveIntensity = 1.2 + pulse * 1.8;
    });
    frameRefs.current.forEach((mat, i) => {
      if (!mat) return;
      const pulse = 0.5 + Math.sin(t * 0.6 + i * 0.8) * 0.5;
      mat.emissiveIntensity = 0.5 + pulse * 0.7;
    });
  });

  // Embed panel size (in world units)
  const PANEL_W = 4.2;
  const PANEL_H = 2.8;
  // HTML iframe pixel size (drei Html transform scales by distanceFactor)
  const iframeW = isMobile ? 520 : 640;
  const iframeH = isMobile ? 360 : 420;

  return (
    <group>
      {/* ---------- Floor ---------- */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
        <circleGeometry args={[WALL_RADIUS + 0.5, 64]} />
        <meshStandardMaterial color="#1a0e08" roughness={0.92} />
      </mesh>
      {/* Subtle floor glow ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.49, 0]}>
        <ringGeometry args={[WALL_RADIUS - 1.5, WALL_RADIUS - 0.2, 64]} />
        <meshBasicMaterial
          color="#ffaa55"
          transparent
          opacity={0.08}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* ---------- Fully enclosed curved wooden wall (360°) ---------- */}
      <Cylinder args={[WALL_RADIUS, WALL_RADIUS, 7, 96, 1, true]} position={[0, 3, 0]}>
        <meshStandardMaterial
          color="#2a160c"
          roughness={0.88}
          metalness={0.08}
          side={THREE.BackSide}
        />
      </Cylinder>

      {/* Inner darker shadow ring at the bottom of the wall */}
      <Cylinder
        args={[WALL_RADIUS - 0.05, WALL_RADIUS - 0.05, 1.2, 96, 1, true]}
        position={[0, 0.1, 0]}
      >
        <meshStandardMaterial color="#0e0703" roughness={1} side={THREE.BackSide} />
      </Cylinder>

      {/* Domed ceiling cap */}
      <mesh position={[0, 6.5, 0]}>
        <sphereGeometry args={[WALL_RADIUS, 64, 32, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#170c06" roughness={0.95} side={THREE.BackSide} />
      </mesh>

      {/* Top accent rim light along the upper edge of the wall */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 6.45, 0]}>
        <torusGeometry args={[WALL_RADIUS - 0.05, 0.04, 8, 128]} />
        <meshBasicMaterial
          color="#7afcd1"
          transparent
          opacity={0.55}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>

      {/* ---------- Bioluminescent moss patches ---------- */}
      {mossPatches.map((p, i) => (
        <mesh key={`moss-${i}`} position={p.pos} rotation={p.rot}>
          <planeGeometry args={[p.scale[0], p.scale[1]]} />
          <meshStandardMaterial
            ref={(el) => {
              if (el) mossRefs.current[i] = el;
            }}
            color={mossColor(p.hue)}
            emissive={mossColor(p.hue)}
            emissiveIntensity={1.5}
            roughness={0.9}
            transparent
            opacity={0.95}
            toneMapped={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}

      {/* ---------- Platform embed panels around the room ---------- */}
      {panels.map((panel, i) => (
        <group
          key={panel.id}
          position={panel.position}
          rotation={[0, panel.rotY, 0]}
        >
          {/* Glowing panel frame */}
          <mesh position={[0, 0, -0.05]}>
            <planeGeometry args={[PANEL_W + 0.4, PANEL_H + 0.7]} />
            <meshStandardMaterial
              ref={(el) => {
                if (el) frameRefs.current[i] = el;
              }}
              color="#3b2415"
              emissive={panel.color}
              emissiveIntensity={0.7}
              roughness={0.5}
              metalness={0.35}
              toneMapped={false}
            />
          </mesh>

          {/* Additive backlight glow */}
          <mesh position={[0, 0, -0.1]}>
            <planeGeometry args={[PANEL_W + 1.6, PANEL_H + 1.8]} />
            <meshBasicMaterial
              color={panel.color}
              transparent
              opacity={0.18}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>

          {/* Label above the panel */}
          <Text
            position={[0, PANEL_H / 2 + 0.28, 0.02]}
            fontSize={0.22}
            color="#ffe4b8"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.008}
            outlineColor="#000000"
          >
            {panel.label}
          </Text>

          {/* Embed (iframe) or placeholder */}
          {panel.src ? (
            <Html
              position={[0, 0, 0.02]}
              transform
              occlude={false}
              distanceFactor={2.4}
              style={{
                width: `${iframeW}px`,
                height: `${iframeH}px`,
                borderRadius: "10px",
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
                borderRadius: "10px",
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background:
                  "linear-gradient(135deg, rgba(20,10,5,0.9), rgba(40,20,10,0.9))",
                color: "#ffe4b8",
                fontFamily: "system-ui, sans-serif",
                fontSize: "28px",
                letterSpacing: "0.15em",
                textAlign: "center",
                boxShadow: `0 0 60px ${panel.color}55, 0 0 20px ${panel.color}55 inset`,
              }}
            >
              <div style={{ padding: "24px" }}>
                <div style={{ fontSize: "14px", opacity: 0.7, marginBottom: 12 }}>
                  COMING SOON
                </div>
                <div>{panel.label}</div>
              </div>
            </Html>
          )}
        </group>
      ))}

      {/* ---------- Center pedestal / firepit-style accent ---------- */}
      <mesh position={[0, -0.35, 0]}>
        <cylinderGeometry args={[0.6, 0.8, 0.3, 24]} />
        <meshStandardMaterial color="#2a160c" roughness={0.9} />
      </mesh>
      <pointLight position={[0, 0.4, 0]} intensity={1.2} color="#ffaa55" distance={14} />

      {/* ---------- Lighting ---------- */}
      <pointLight position={[0, 5, 0]} intensity={0.9} color="#ffc870" distance={20} />
      <pointLight position={[0, 2, 0]} intensity={0.4} color="#7afcd1" distance={16} />
      <ambientLight intensity={0.28} color="#3a2a1a" />
    </group>
  );
}
