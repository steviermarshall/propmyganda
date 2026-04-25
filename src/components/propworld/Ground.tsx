import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export default function Ground() {
  const matRef = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uColorA: { value: new THREE.Color("#03100d") },
      uColorB: { value: new THREE.Color("#06182a") },
      uShimmer: { value: new THREE.Color("#ffc870") },
    }),
    []
  );

  useFrame((state) => {
    if (matRef.current) matRef.current.uniforms.uTime.value = state.clock.getElapsedTime();
  });

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[80, 80, 64, 64]} />
      <shaderMaterial
        ref={matRef}
        uniforms={uniforms}
        vertexShader={`
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          uniform float uTime;
          uniform vec3 uColorA;
          uniform vec3 uColorB;
          uniform vec3 uShimmer;
          varying vec2 vUv;

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

          void main() {
            float dist = length(vUv - 0.5);
            vec3 base = mix(uColorB, uColorA, smoothstep(0.0, 0.6, dist));
            float n = noise(vUv * 14.0 + uTime * 0.12);
            float n2 = noise(vUv * 32.0 - uTime * 0.22);
            float shimmer = pow(n * n2, 3.0) * 1.8;
            float vignette = smoothstep(0.7, 0.1, dist);
            vec3 col = base + uShimmer * shimmer * vignette * 0.7;
            gl_FragColor = vec4(col, 1.0);
          }
        `}
      />
    </mesh>
  );
}
