import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/* ---------- Shader-painted mossy floor ---------- */
function MossFloor() {
  const matRef = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uMossDeep: { value: new THREE.Color("#04140e") },
      uMossMid: { value: new THREE.Color("#0a3a25") },
      uMossLight: { value: new THREE.Color("#1a6a44") },
      uDirt: { value: new THREE.Color("#0a1a14") },
      uHighlight: { value: new THREE.Color("#3fffb0") },
    }),
    []
  );

  useFrame((state) => {
    if (matRef.current) matRef.current.uniforms.uTime.value = state.clock.getElapsedTime();
  });

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[80, 80, 96, 96]} />
      <shaderMaterial
        ref={matRef}
        uniforms={uniforms}
        vertexShader={`
          varying vec2 vUv;
          varying vec3 vWorldPos;
          void main() {
            vUv = uv;
            vec4 wp = modelMatrix * vec4(position, 1.0);
            vWorldPos = wp.xyz;
            gl_Position = projectionMatrix * viewMatrix * wp;
          }
        `}
        fragmentShader={`
          uniform float uTime;
          uniform vec3 uMossDeep;
          uniform vec3 uMossMid;
          uniform vec3 uMossLight;
          uniform vec3 uDirt;
          uniform vec3 uHighlight;
          varying vec2 vUv;
          varying vec3 vWorldPos;

          float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
          float noise(vec2 p){
            vec2 i = floor(p); vec2 f = fract(p);
            float a = hash(i);
            float b = hash(i + vec2(1.0, 0.0));
            float c = hash(i + vec2(0.0, 1.0));
            float d = hash(i + vec2(1.0, 1.0));
            vec2 u = f * f * (3.0 - 2.0 * f);
            return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
          }
          float fbm(vec2 p){
            float v = 0.0;
            float a = 0.5;
            for(int i=0; i<5; i++){
              v += a * noise(p);
              p *= 2.04;
              a *= 0.5;
            }
            return v;
          }

          void main() {
            vec2 wp = vWorldPos.xz;

            // Large-scale moss vs dirt distribution
            float macro = fbm(wp * 0.06);
            // Fine grass detail
            float micro = fbm(wp * 0.9 + 13.0);
            // Tiny grass-blade speckle
            float speckle = noise(wp * 8.0);

            // Base: blend dirt → mid moss → light moss
            vec3 col = mix(uDirt, uMossMid, smoothstep(0.25, 0.55, macro));
            col = mix(col, uMossLight, smoothstep(0.55, 0.85, macro) * 0.85);
            col = mix(col, uMossDeep, smoothstep(0.0, 0.18, macro));

            // Add grass-blade variation
            col += (micro - 0.5) * 0.08;
            col += vec3(0.0, speckle * 0.04, speckle * 0.02);

            // Slow mossy highlight breathing (bioluminescent damp moss)
            float glow = pow(fbm(wp * 0.4 + uTime * 0.05), 4.0) * 1.4;
            col += uHighlight * glow * 0.25;

            // Distance darkening (centered around origin)
            float d = length(wp) / 32.0;
            float vignette = smoothstep(1.0, 0.1, d);
            col *= 0.4 + vignette * 0.7;

            gl_FragColor = vec4(col, 1.0);
          }
        `}
      />
    </mesh>
  );
}

/* ---------- Mossy mounds (low-poly hemispheres dotted around) ---------- */
function MossMounds() {
  const mounds = useMemo(() => {
    const items: { pos: [number, number, number]; scale: [number, number, number]; tone: number }[] = [];
    const seed = (n: number) => {
      const x = Math.sin(n * 7919.31) * 43758.5453;
      return x - Math.floor(x);
    };
    for (let i = 0; i < 90; i++) {
      const a = seed(i) * Math.PI * 2;
      const r = 5.5 + seed(i + 50) * 17;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      // skip if too close to center where ancient tree sits
      if (Math.hypot(x, z) < 5.2) continue;
      const sx = 0.45 + seed(i + 100) * 1.0;
      const sy = 0.18 + seed(i + 150) * 0.35;
      const sz = 0.45 + seed(i + 200) * 1.0;
      items.push({ pos: [x, sy * 0.4, z], scale: [sx, sy, sz], tone: seed(i + 250) });
    }
    return items;
  }, []);

  return (
    <group>
      {mounds.map((m, i) => {
        const c = new THREE.Color().setHSL(0.36, 0.55, 0.10 + m.tone * 0.07);
        return (
          <mesh key={i} position={m.pos} scale={m.scale}>
            <sphereGeometry args={[1, 8, 6]} />
            <meshStandardMaterial color={c} roughness={1} flatShading />
          </mesh>
        );
      })}
    </group>
  );
}

/* ---------- Grass blades (instanced thin tapered cones) ---------- */
function GrassBlades({ count = 1400 }: { count?: number }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  const transforms = useMemo(() => {
    const arr: { x: number; z: number; h: number; rot: number; tone: number }[] = [];
    const seed = (n: number) => {
      const x = Math.sin(n * 5417.91) * 43758.5453;
      return x - Math.floor(x);
    };
    for (let i = 0; i < count; i++) {
      const a = seed(i) * Math.PI * 2;
      const r = 5.4 + seed(i + 50) * 18;
      const x = Math.cos(a) * r + (seed(i + 100) - 0.5) * 1.5;
      const z = Math.sin(a) * r + (seed(i + 150) - 0.5) * 1.5;
      if (Math.hypot(x, z) < 5.0) continue;
      arr.push({
        x,
        z,
        h: 0.18 + seed(i + 200) * 0.32,
        rot: seed(i + 300) * Math.PI * 2,
        tone: seed(i + 400),
      });
    }
    return arr;
  }, [count]);

  // Set instance matrices once
  useMemo(() => {
    if (!meshRef.current) return;
    transforms.forEach((t, i) => {
      dummy.position.set(t.x, t.h * 0.5, t.z);
      dummy.rotation.set(0, t.rot, 0);
      dummy.scale.set(0.04, t.h, 0.04);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
      const c = new THREE.Color().setHSL(0.32 + t.tone * 0.06, 0.7, 0.18 + t.tone * 0.1);
      meshRef.current!.setColorAt(i, c);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  }, [transforms, dummy]);

  // Gentle sway
  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.getElapsedTime();
    meshRef.current.rotation.y = Math.sin(t * 0.15) * 0.005;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined as never, undefined as never, transforms.length]}>
      <coneGeometry args={[1, 1, 4]} />
      <meshStandardMaterial vertexColors roughness={1} flatShading />
    </instancedMesh>
  );
}

/* ---------- Tiny accent flowers (yellow + cyan) ---------- */
function Flowers() {
  const flowers = useMemo(() => {
    const items: { pos: [number, number, number]; color: string }[] = [];
    const seed = (n: number) => {
      const x = Math.sin(n * 3331.7) * 43758.5453;
      return x - Math.floor(x);
    };
    for (let i = 0; i < 80; i++) {
      const a = seed(i) * Math.PI * 2;
      const r = 5.5 + seed(i + 50) * 16;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      if (Math.hypot(x, z) < 5.2) continue;
      const yellow = seed(i + 100) > 0.5;
      items.push({ pos: [x, 0.06, z], color: yellow ? "#ffd86b" : "#7adfff" });
    }
    return items;
  }, []);

  return (
    <group>
      {flowers.map((f, i) => (
        <mesh key={i} position={f.pos}>
          <sphereGeometry args={[0.07, 6, 6]} />
          <meshStandardMaterial
            color={f.color}
            emissive={f.color}
            emissiveIntensity={0.6}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}

export default function Ground() {
  return (
    <group>
      <MossFloor />
      <MossMounds />
      <GrassBlades count={1600} />
      <Flowers />
    </group>
  );
}
