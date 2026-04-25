import { Suspense, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  OrbitControls,
  Stars,
  Float,
  MeshDistortMaterial,
  Environment,
  Sparkles,
} from "@react-three/drei";
import * as THREE from "three";

function PulsingCore() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.getElapsedTime();
    meshRef.current.rotation.x = t * 0.15;
    meshRef.current.rotation.y = t * 0.2;
    const s = 1 + Math.sin(t * 1.5) * 0.05;
    meshRef.current.scale.set(s, s, s);
  });

  return (
    <Float speed={1.4} rotationIntensity={0.6} floatIntensity={1.2}>
      <mesh ref={meshRef}>
        <icosahedronGeometry args={[1.4, 4]} />
        <MeshDistortMaterial
          color="#00f0ff"
          emissive="#0088ff"
          emissiveIntensity={0.4}
          distort={0.45}
          speed={2}
          roughness={0.15}
          metalness={0.85}
        />
      </mesh>
    </Float>
  );
}

function OrbitingNodes() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.getElapsedTime() * 0.25;
    }
  });

  const nodes = [
    { angle: 0, color: "#ff00aa" },
    { angle: (Math.PI * 2) / 3, color: "#00f0ff" },
    { angle: (Math.PI * 4) / 3, color: "#ffaa00" },
  ];

  return (
    <group ref={groupRef}>
      {nodes.map((node, i) => {
        const radius = 3.2;
        const x = Math.cos(node.angle) * radius;
        const z = Math.sin(node.angle) * radius;
        return (
          <Float key={i} speed={2} rotationIntensity={1} floatIntensity={1.5}>
            <mesh position={[x, 0, z]}>
              <octahedronGeometry args={[0.35, 0]} />
              <meshStandardMaterial
                color={node.color}
                emissive={node.color}
                emissiveIntensity={0.8}
                metalness={0.6}
                roughness={0.2}
              />
            </mesh>
          </Float>
        );
      })}
    </group>
  );
}

export default function PropworldScene() {
  return (
    <Canvas
      camera={{ position: [0, 0, 6], fov: 55 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
    >
      <color attach="background" args={["#03030a"]} />
      <fog attach="fog" args={["#03030a", 8, 18]} />

      <ambientLight intensity={0.3} />
      <pointLight position={[5, 5, 5]} intensity={1.2} color="#00f0ff" />
      <pointLight position={[-5, -3, -5]} intensity={0.8} color="#ff00aa" />

      <Suspense fallback={null}>
        <PulsingCore />
        <OrbitingNodes />
        <Sparkles count={120} scale={10} size={2} speed={0.4} color="#88ddff" />
        <Stars radius={50} depth={40} count={2000} factor={4} fade speed={1} />
        <Environment preset="night" />
      </Suspense>

      <OrbitControls
        enableZoom={false}
        enablePan={false}
        autoRotate
        autoRotateSpeed={0.6}
        minPolarAngle={Math.PI / 2.6}
        maxPolarAngle={Math.PI / 1.6}
      />
    </Canvas>
  );
}
