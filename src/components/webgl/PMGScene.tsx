import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import logo from "@/assets/pmg-logo-clean.png";

/* ---------- Distorted, glitched logo plane ---------- */
const LogoPlane = () => {
  const [tex, setTex] = useState<THREE.Texture | null>(null);
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const { viewport, pointer } = useThree();

  useEffect(() => {
    let cancelled = false;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (cancelled) return;
      const t = new THREE.Texture(img);
      t.needsUpdate = true;
      t.colorSpace = THREE.SRGBColorSpace;
      setTex(t);
    };
    img.onerror = (e) => {
      console.warn("Logo texture failed to load", e);
    };
    img.src = logo;
    return () => {
      cancelled = true;
    };
  }, []);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uTex: { value: tex },
      uMouse: { value: new THREE.Vector2(0, 0) },
      uHover: { value: 0 },
    }),
    [tex]
  );


  useFrame((_, delta) => {
    if (!matRef.current) return;
    matRef.current.uniforms.uTime.value += delta;
    matRef.current.uniforms.uMouse.value.lerp(
      new THREE.Vector2(pointer.x, pointer.y),
      0.08
    );
    if (meshRef.current) {
      meshRef.current.rotation.y = pointer.x * 0.25;
      meshRef.current.rotation.x = -pointer.y * 0.15;
    }
  });

  // Fit logo to viewport (logo aspect ~ 325/167)
  const w = Math.min(viewport.width * 0.7, 8);
  const h = w * (167 / 325);

  if (!tex) return null;

  return (
    <Float speed={1.2} rotationIntensity={0.15} floatIntensity={0.3}>
      <mesh ref={meshRef} scale={[w, h, 1]}>
        <planeGeometry args={[1, 1, 64, 64]} />
        <shaderMaterial
          ref={matRef}
          uniforms={uniforms}
          transparent
          vertexShader={`
            uniform float uTime;
            uniform vec2 uMouse;
            varying vec2 vUv;
            void main() {
              vUv = uv;
              vec3 p = position;
              float wave = sin(p.x * 4.0 + uTime * 1.5) * 0.04;
              wave += cos(p.y * 6.0 + uTime * 1.2) * 0.03;
              float dist = distance(uv, uMouse * 0.5 + 0.5);
              wave += smoothstep(0.4, 0.0, dist) * 0.15;
              p.z += wave;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
            }
          `}
          fragmentShader={`
            uniform sampler2D uTex;
            uniform float uTime;
            varying vec2 vUv;
            void main() {
              float glitch = step(0.997, fract(sin(floor(uTime * 8.0)) * 43758.5453));
              float off = glitch * 0.02;
              float r = texture2D(uTex, vUv + vec2(off, 0.0)).r;
              float g = texture2D(uTex, vUv).g;
              float b = texture2D(uTex, vUv - vec2(off, 0.0)).b;
              float a = texture2D(uTex, vUv).a;
              vec3 col = vec3(r, g, b);
              // scanlines
              col *= 0.85 + 0.15 * sin(vUv.y * 800.0);
              gl_FragColor = vec4(col, a);
            }
          `}
        />
      </mesh>
    </Float>
  );
};

/* ---------- Particle field background ---------- */
const Particles = ({ count = 1500 }: { count?: number }) => {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 30;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 20;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 20 - 5;
    }
    return arr;
  }, [count]);

  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.y += delta * 0.02;
      ref.current.rotation.x += delta * 0.005;
    }
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#ffffff"
        size={0.025}
        sizeAttenuation
        transparent
        opacity={0.6}
      />
    </points>
  );
};

/* ---------- Rotating wireframe rings ---------- */
const Rings = () => {
  const g1 = useRef<THREE.Mesh>(null);
  const g2 = useRef<THREE.Mesh>(null);
  useFrame((_, d) => {
    if (g1.current) {
      g1.current.rotation.x += d * 0.2;
      g1.current.rotation.y += d * 0.1;
    }
    if (g2.current) {
      g2.current.rotation.x -= d * 0.15;
      g2.current.rotation.z += d * 0.2;
    }
  });
  return (
    <>
      <mesh ref={g1} position={[0, 0, -3]}>
        <torusGeometry args={[3.5, 0.005, 8, 120]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.25} />
      </mesh>
      <mesh ref={g2} position={[0, 0, -3]}>
        <torusGeometry args={[4.2, 0.005, 8, 120]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.15} />
      </mesh>
    </>
  );
};

const PMGScene = () => {
  return (
    <Canvas
      camera={{ position: [0, 0, 5], fov: 50 }}
      gl={{ antialias: true, alpha: false }}
      dpr={[1, 2]}
    >
      <color attach="background" args={["#000000"]} />
      <fog attach="fog" args={["#000000", 6, 18]} />
      <Suspense fallback={null}>
        <Particles />
        <Rings />
        <LogoPlane />
      </Suspense>
    </Canvas>
  );
};

export default PMGScene;
