import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  OrbitControls,
  Float,
  Points,
  PointMaterial,
  Cylinder,
  Cone,
} from "@react-three/drei";
import * as THREE from "three";

/* -------------------- Animated Fog -------------------- */
function AnimatedFog() {
  const { scene } = useThreeScene();
  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (scene.fog && "near" in scene.fog && "far" in scene.fog) {
      const fog = scene.fog as THREE.Fog;
      fog.near = 4 + Math.sin(t * 0.2) * 0.8;
      fog.far = 22 + Math.cos(t * 0.15) * 2;
    }
  });
  return null;
}
// Tiny helper hook so we can grab the scene without importing useThree from r3f path collisions
import { useThree } from "@react-three/fiber";
function useThreeScene() {
  return useThree();
}

/* -------------------- Fireflies / Spores -------------------- */
function Fireflies({ count = 400 }: { count?: number }) {
  const pointsRef = useRef<THREE.Points>(null);

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 24;
      arr[i * 3 + 1] = Math.random() * 6 + 0.3;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 24;
    }
    return arr;
  }, [count]);

  const seeds = useMemo(
    () => new Float32Array(Array.from({ length: count }, () => Math.random() * Math.PI * 2)),
    [count]
  );

  useFrame((state) => {
    if (!pointsRef.current) return;
    const t = state.clock.getElapsedTime();
    const geom = pointsRef.current.geometry as THREE.BufferGeometry;
    const pos = geom.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < count; i++) {
      const s = seeds[i];
      pos.array[i * 3 + 1] =
        (pos.array[i * 3 + 1] as number) + Math.sin(t * 0.6 + s) * 0.0035;
      pos.array[i * 3] =
        (pos.array[i * 3] as number) + Math.cos(t * 0.4 + s) * 0.0025;
    }
    pos.needsUpdate = true;
    pointsRef.current.rotation.y = t * 0.02;
  });

  return (
    <Points ref={pointsRef} positions={positions} stride={3}>
      <PointMaterial
        transparent
        depthWrite={false}
        size={0.08}
        sizeAttenuation
        color="#a8ffd6"
        opacity={0.9}
        blending={THREE.AdditiveBlending}
      />
    </Points>
  );
}

/* -------------------- God Rays (volumetric-style cones) -------------------- */
function GodRay({
  position,
  rotation = [0, 0, 0],
  height = 14,
  radius = 1.6,
  color = "#bff7d6",
  opacity = 0.08,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  height?: number;
  radius?: number;
  color?: string;
  opacity?: number;
}) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.getElapsedTime();
    const mat = ref.current.material as THREE.MeshBasicMaterial;
    mat.opacity = opacity + Math.sin(t * 0.8 + position[0]) * 0.02;
  });

  return (
    <Cone
      ref={ref}
      args={[radius, height, 32, 1, true]}
      position={position}
      rotation={rotation}
    >
      <meshBasicMaterial
        color={color}
        transparent
        opacity={opacity}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        side={THREE.DoubleSide}
      />
    </Cone>
  );
}

function GodRays() {
  const rays: Array<{
    position: [number, number, number];
    rotation: [number, number, number];
    radius: number;
    height: number;
    opacity: number;
  }> = [
    { position: [-4, 4, -3], rotation: [0.1, 0, 0.1], radius: 1.4, height: 14, opacity: 0.1 },
    { position: [3, 4, -2], rotation: [-0.05, 0, -0.08], radius: 1.8, height: 14, opacity: 0.09 },
    { position: [0, 4, -6], rotation: [0.05, 0, 0], radius: 2.2, height: 16, opacity: 0.07 },
    { position: [6, 4, 1], rotation: [0, 0, -0.12], radius: 1.2, height: 13, opacity: 0.08 },
    { position: [-6, 4, 2], rotation: [0, 0, 0.12], radius: 1.3, height: 13, opacity: 0.08 },
  ];
  return (
    <>
      {rays.map((r, i) => (
        <GodRay key={i} {...r} color="#cdeed0" />
      ))}
    </>
  );
}

/* -------------------- Trees -------------------- */
function Tree({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      <Cylinder args={[0.18, 0.28, 3, 8]} position={[0, 1.5, 0]} castShadow>
        <meshStandardMaterial color="#1a1410" roughness={0.95} />
      </Cylinder>
      <Cone args={[1.6, 4, 10]} position={[0, 4.5, 0]}>
        <meshStandardMaterial color="#0a3d2c" roughness={0.85} />
      </Cone>
      <Cone args={[1.3, 3, 10]} position={[0, 5.8, 0]}>
        <meshStandardMaterial color="#0d4a35" roughness={0.85} />
      </Cone>
      <Cone args={[1.0, 2.4, 10]} position={[0, 7, 0]}>
        <meshStandardMaterial color="#0f5a3f" roughness={0.85} />
      </Cone>
    </group>
  );
}

function Forest() {
  const positions = useMemo(() => {
    const items: Array<{ pos: [number, number, number]; scale: number }> = [];
    const seed = (n: number) => {
      const x = Math.sin(n * 9999) * 43758.5453;
      return x - Math.floor(x);
    };
    let count = 0;
    for (let i = 0; i < 26; i++) {
      const r = 6 + seed(i) * 9;
      const a = seed(i + 100) * Math.PI * 2;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      const s = 0.7 + seed(i + 200) * 0.6;
      items.push({ pos: [x, 0, z], scale: s });
      count++;
      if (count > 30) break;
    }
    return items;
  }, []);

  return (
    <group>
      {positions.map((t, i) => (
        <Tree key={i} position={t.pos} scale={t.scale} />
      ))}
    </group>
  );
}

/* -------------------- Shimmering Ground -------------------- */
function Ground() {
  const matRef = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uColorA: { value: new THREE.Color("#04140f") },
      uColorB: { value: new THREE.Color("#0a2a3a") },
      uShimmer: { value: new THREE.Color("#5fffc4") },
    }),
    []
  );

  useFrame((state) => {
    if (matRef.current) {
      matRef.current.uniforms.uTime.value = state.clock.getElapsedTime();
    }
  });

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[60, 60, 64, 64]} />
      <shaderMaterial
        ref={matRef}
        uniforms={uniforms}
        vertexShader={`
          varying vec2 vUv;
          varying vec3 vPos;
          void main() {
            vUv = uv;
            vPos = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          uniform float uTime;
          uniform vec3 uColorA;
          uniform vec3 uColorB;
          uniform vec3 uShimmer;
          varying vec2 vUv;
          varying vec3 vPos;

          // simple hash noise
          float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
          float noise(vec2 p){
            vec2 i = floor(p);
            vec2 f = fract(p);
            float a = hash(i);
            float b = hash(i + vec2(1.0, 0.0));
            float c = hash(i + vec2(0.0, 1.0));
            float d = hash(i + vec2(1.0, 1.0));
            vec2 u = f * f * (3.0 - 2.0 * f);
            return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
          }

          void main() {
            float dist = length(vUv - 0.5);
            vec3 base = mix(uColorB, uColorA, smoothstep(0.0, 0.6, dist));

            // moving shimmer
            float n = noise(vUv * 12.0 + uTime * 0.15);
            float n2 = noise(vUv * 30.0 - uTime * 0.25);
            float shimmer = pow(n * n2, 3.0) * 1.6;

            // radial fade so edges blend with fog
            float vignette = smoothstep(0.7, 0.1, dist);

            vec3 col = base + uShimmer * shimmer * vignette * 0.9;
            gl_FragColor = vec4(col, 1.0);
          }
        `}
      />
    </mesh>
  );
}

/* -------------------- Scene -------------------- */
export default function PropworldScene() {
  return (
    <Canvas
      shadows
      camera={{ position: [0, 2.4, 9], fov: 55 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: false }}
    >
      <color attach="background" args={["#02060a"]} />
      <fog attach="fog" args={["#03100f", 6, 22]} />
      <AnimatedFog />

      {/* Lighting — moonlit / emerald */}
      <ambientLight intensity={0.18} color="#5a8fa0" />
      <directionalLight
        position={[6, 12, 4]}
        intensity={0.9}
        color="#cdeed0"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <pointLight position={[-6, 3, -4]} intensity={0.6} color="#1e90ff" />
      <pointLight position={[5, 2, 5]} intensity={0.5} color="#10b981" />

      <Suspense fallback={null}>
        <Ground />
        <Forest />
        <GodRays />
        <Float speed={0.6} floatIntensity={0.4} rotationIntensity={0.2}>
          <Fireflies count={500} />
        </Float>
      </Suspense>

      <OrbitControls
        enableZoom={false}
        enablePan={false}
        autoRotate
        autoRotateSpeed={0.25}
        minPolarAngle={Math.PI / 2.6}
        maxPolarAngle={Math.PI / 1.9}
      />
    </Canvas>
  );
}
